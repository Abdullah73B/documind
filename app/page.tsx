"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, FileText, FolderOpen, LayoutDashboard, Settings, Bell, ChevronDown, MoreHorizontal, UploadCloud, Sparkles, ShieldCheck, ArrowUpRight, File, Menu, X, Command, Filter, LogOut, LockKeyhole } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Doc = { id: string; name: string; type: string; size: string; updated: string; status: string; collection: string; color: string; storage_path: string };
type Collection = { id: string; name: string };
const formatSize = (bytes: number) => bytes > 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";

function AuthScreen() {
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("Account created. Check your email to confirm, then sign in.");
    else setMessage("Signed in successfully. Loading your workspace…");
  }
  return <main className="auth-shell"><div className="auth-card"><div className="brand auth-brand"><div className="brand-mark"><Command size={19}/></div><span>docu<span className="brand-light">mind</span></span></div><div className="auth-icon"><LockKeyhole size={21}/></div><h1>{mode === "signup" ? "Create your workspace" : "Welcome back"}</h1><p className="subheading">Your documents stay private and belong to you.</p><form onSubmit={submit} className="auth-form"><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required autoComplete={mode === "signup" ? "new-password" : "current-password"}/></label><button className="auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create free account" : "Sign in"}</button></form>{message && <div className="notice auth-message" role="status">{message}</div>}<p className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to DocuMind?"} <button onClick={()=>{setMode(mode==="signup"?"signin":"signup");setMessage("");}}>{mode==="signup"?"Sign in":"Create an account"}</button></p><small className="auth-foot">Free to use · No paid AI API · Private file storage</small></div></main>;
}


type ExtractedPage = { page: number | null; text: string };
async function extractDocument(file: File): Promise<ExtractedPage[]> {
  if (file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: ExtractedPage[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => "str" in item ? item.str : "").join(" ").replace(/\s+/g, " ").trim();
      if (text) pages.push({ page: pageNumber, text });
    }
    return pages;
  }
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  const text = result.value.replace(/\s+/g, " ").trim();
  return text ? [{ page: null, text }] : [];
}
function makeChunks(pages: ExtractedPage[]) {
  const chunks: { chunk_index: number; page_number: number | null; content: string; token_count: number }[] = [];
  for (const page of pages) {
    const words = page.text.split(/\s+/);
    for (let start = 0; start < words.length; start += 155) {
      const content = words.slice(start, start + 180).join(" ").trim();
      if (content.length > 30) chunks.push({ chunk_index: chunks.length, page_number: page.page, content, token_count: Math.ceil(content.length / 4) });
    }
  }
  return chunks;
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [active, setActive] = useState("Overview");
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collection, setCollection] = useState("All documents");
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [askQuery, setAskQuery] = useState("");
  const [evidence, setEvidence] = useState<{id:string;document_id:string;page_number:number|null;content:string}[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{name:string;text:string;path:string}|null>(null);

  const loadWorkspace = useCallback(async (userId: string) => {
    const [{ data: documentRows, error: docError }, { data: collectionRows, error: collectionError }] = await Promise.all([
      supabase.from("documents").select("id,title,original_filename,mime_type,file_size_bytes,processing_status,collection_id,storage_path,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("collections").select("id,name").eq("user_id", userId).order("name")
    ]);
    if (docError) { setNotice("Could not load documents: " + docError.message); return; }
    if (collectionError) { setNotice("Could not load collections: " + collectionError.message); return; }
    const cols = (collectionRows || []) as Collection[];
    setCollections(cols);
    setDocs((documentRows || []).map((d: any) => {
      const col = cols.find(c => c.id === d.collection_id);
      return { id: d.id, name: d.original_filename || d.title, type: d.mime_type.includes("pdf") ? "PDF" : "DOCX", size: formatSize(Number(d.file_size_bytes)), updated: new Date(d.created_at).toLocaleDateString(), status: d.processing_status === "ready" ? "Ready" : d.processing_status === "error" ? "Needs attention" : "Uploaded", collection: col?.name || "Unsorted", color: d.mime_type.includes("pdf") ? "violet" : "blue", storage_path: d.storage_path };
    }));
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); if (data.user) void loadWorkspace(data.user.id); setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void loadWorkspace(session.user.id); else { setDocs([]); setCollections([]); }
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase, loadWorkspace]);

  async function addFiles(files: FileList | null) {
    if (!files?.length || !user) return;
    const accepted = Array.from(files).filter(f => /\.(pdf|docx)$/i.test(f.name) && f.size <= 10 * 1024 * 1024);
    if (!accepted.length) { setNotice("Choose a PDF or DOCX file up to 10 MB."); return; }
    setUploading(true); setNotice("");
    let uploaded = 0;
    for (const file of accepted) {
      const ext = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "docx";
      const path = user.id + "/" + crypto.randomUUID() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { error: storageError } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || (ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), upsert: false });
      if (storageError) { setNotice("Upload failed for " + file.name + ": " + storageError.message); continue; }
      const { data: documentRow, error: rowError } = await supabase.from("documents").insert({ title: file.name.replace(/\.(pdf|docx)$/i, ""), original_filename: file.name, mime_type: ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document", file_size_bytes: file.size, storage_path: path, processing_status: "processing" }).select("id").single();
      if (rowError || !documentRow) { await supabase.storage.from("documents").remove([path]); setNotice("File record failed for " + file.name + ": " + (rowError?.message || "Unknown database error")); continue; }
      try {
        const pages = await extractDocument(file);
        if (!pages.length) throw new Error("No selectable text found. This may be a scanned PDF; OCR is not available yet.");
        const chunks = makeChunks(pages);
        const { error: chunkError } = await supabase.from("document_chunks").insert(chunks.map(chunk => ({ ...chunk, document_id: documentRow.id })));
        if (chunkError) throw chunkError;
        const extractedText = pages.map(p => p.text).join("\\n\\n");
        const { error: updateError } = await supabase.from("documents").update({ extracted_text: extractedText, page_count: ext === "pdf" ? pages.length : null, processing_status: "ready", processing_error: null }).eq("id", documentRow.id);
        if (updateError) throw updateError;
        uploaded++;
      } catch (processingError) {
        const reason = processingError instanceof Error ? processingError.message : "Text extraction failed";
        await supabase.from("documents").update({ processing_status: "error", processing_error: reason }).eq("id", documentRow.id);
        setNotice("Uploaded " + file.name + " but couldn't extract its text: " + reason);
      }
    }
    await loadWorkspace(user.id); setUploading(false); setActive("Documents");
    if (uploaded) setNotice(uploaded + " file(s) uploaded and text extracted. You can now search their contents.");
  }

  async function searchEvidence() {
    const term = askQuery.trim();
    if (term.length < 3) { setNotice("Enter at least 3 characters to search document text."); return; }
    setSearching(true); setEvidence([]);
    const safeTerm = term.replace(/[,%_]/g, " ").slice(0, 100);
    const { data, error } = await supabase.from("document_chunks").select("id,document_id,page_number,content").ilike("content", "%" + safeTerm + "%").limit(12);
    setSearching(false);
    if (error) { setNotice("Evidence search failed: " + error.message); return; }
    setEvidence(data || []);
    if (!data?.length) setNotice("No matching passages found in your extracted documents.");
  }

  async function openDocument(d: Doc) { const {data,error}=await supabase.from("documents").select("extracted_text").eq("id",d.id).single(); if(error){setNotice(error.message);return;} setSelectedDoc({name:d.name,text:data.extracted_text||"No extracted text is available.",path:d.storage_path}); }

  async function downloadDocument(d: Doc) { const {data,error}=await supabase.storage.from("documents").createSignedUrl(d.storage_path,60); if(error||!data?.signedUrl){setNotice(error?.message||"Could not create download link.");return;} window.open(data.signedUrl,"_blank","noopener,noreferrer"); }

  async function moveDocument(d: Doc, collectionId: string) { const {error}=await supabase.from("documents").update({collection_id:collectionId||null}).eq("id",d.id); if(error)setNotice(error.message); else if(user)await loadWorkspace(user.id); }

  async function createCollection() {
    const name = window.prompt("Name your collection");
    if (!name?.trim() || !user) return;
    const { error } = await supabase.from("collections").insert({ name: name.trim() });
    if (error) setNotice("Could not create collection: " + error.message);
    else { await loadWorkspace(user.id); setNotice("Collection created."); }
  }

  const filtered = useMemo(() => docs.filter(d => (collection === "All documents" || d.collection === collection) && d.name.toLowerCase().includes(query.toLowerCase())), [docs, collection, query]);
  if (authLoading) return <main className="auth-shell"><div className="auth-loading">Opening your private workspace…</div></main>;
  if (!user) return <AuthScreen />;

  return <main className="shell">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Command size={19}/></div><span>docu<span className="brand-light">mind</span></span><button className="mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace"><div className="workspace-avatar">D</div><div><b>Personal workspace</b><small>Free plan</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{[{name:"Overview",icon:LayoutDashboard},{name:"Documents",icon:FileText},{name:"Collections",icon:FolderOpen}].map(n => <button key={n.name} className={active===n.name?"nav-item selected":"nav-item"} onClick={()=>{setActive(n.name);setMobileNav(false)}}><n.icon size={17}/>{n.name}{n.name==="Documents"&&<span className="nav-count">{docs.length}</span>}</button>)}</nav>
      <div className="nav-label collection-label">YOUR COLLECTIONS <button onClick={createCollection}><Plus size={14}/></button></div>
      {collections.map(c=><button key={c.id} className="collection-link" onClick={()=>{setCollection(c.name);setActive("Documents")}}><span className="collection-dot purple"/>{c.name}</button>)}
      <button className="collection-link" onClick={()=>{setCollection("All documents");setActive("Documents")}}><span className="collection-dot gray"/>Unsorted</button>
      <div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={17}/><div><b>Your files stay yours</b><small>Private storage, built for trust.</small></div></div><button className="nav-item" onClick={()=>setNotice("Account: "+user.email)}><Settings size={17}/>Account settings</button><div className="profile"><div className="profile-avatar">{(user.email||"U")[0].toUpperCase()}</div><div><b>{user.email}</b><small>Free workspace</small></div><button className="row-more" aria-label="Sign out" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <section className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumbs">Workspace <span>/</span> <b>{active}</b></div><div className="top-actions"><button className="icon-button" aria-label="Notifications" onClick={()=>setNotice("You're all caught up.")}><Bell size={18}/></button><div className="top-avatar">{(user.email||"U")[0].toUpperCase()}</div></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow">YOUR PRIVATE WORKSPACE</div><h1>{active==="Overview"?"Good evening.":active}</h1><p className="subheading">{active==="Overview"?"Your knowledge, organised and ready to explore.":"Manage and explore the documents in your workspace."}</p></div><label className="primary-button"><Plus size={17}/>{uploading?"Uploading…":"Add documents"}<input type="file" accept=".pdf,.docx" multiple onChange={e=>{void addFiles(e.target.files);e.currentTarget.value="";}} hidden disabled={uploading}/></label></div>
        {notice && <div className="notice" role="status">{notice}<button onClick={()=>setNotice("")}><X size={15}/></button></div>}
        <div className="stats-grid"><div className="stat-card"><div className="stat-icon lavender"><FileText size={18}/></div><span>Total documents</span><strong>{docs.length}</strong><small>Saved in your workspace</small></div><div className="stat-card"><div className="stat-icon mint"><FolderOpen size={18}/></div><span>Collections</span><strong>{collections.length}</strong><small>Your organised knowledge</small></div><div className="stat-card"><div className="stat-icon peach"><Sparkles size={18}/></div><span>Ready to ask</span><strong>{docs.filter(d=>d.status==="Ready").length}</strong><small>Extracted text is searchable</small></div></div>
        <section className="ask-card"><div className="ask-icon"><Sparkles size={19}/></div><div className="ask-copy"><h2>Search your evidence</h2><p>Find matching passages in your PDFs and DOCX files.</p><div className="evidence-search"><input value={askQuery} onChange={e=>setAskQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void searchEvidence();}} placeholder="e.g. project objectives, payment terms..."/><button onClick={()=>void searchEvidence()} disabled={searching}>{searching?"Searching…":"Search"}</button></div></div><div className="ask-glow"/></section>
        {evidence.length>0 && <section className="evidence-results"><div className="evidence-results-head"><b>Matching passages</b><span>{evidence.length} results</span></div>{evidence.map(item=>{const doc=docs.find(d=>d.id===item.document_id);return <article className="evidence-result" key={item.id}><div className="evidence-source"><FileText size={14}/><b>{doc?.name||"Document"}</b><span>{item.page_number ? "Page "+item.page_number : "DOCX passage"}</span></div><p>{item.content}</p></article>;})}</section>}
        <div className="section-heading"><div><h2>Recent documents</h2><p>Your latest additions and updates</p></div><button className="text-button" onClick={()=>{setActive("Documents");setCollection("All documents")}}>View all <ArrowUpRight size={15}/></button></div>
        <div className="toolbar"><div className="searchbox"><Search size={17}/><input placeholder="Search documents..." value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="filter-button" onClick={()=>setNotice("Showing documents in "+collection)}><Filter size={16}/>{collection}</button></div>
        <div className="document-table"><div className="table-head"><span>NAME</span><span>COLLECTION</span><span>LAST UPDATED</span><span>STATUS</span><span></span></div>{filtered.length ? filtered.map(d=><div className="document-row" key={d.id}><div className="file-name"><div className={`file-icon ${d.color}`}><File size={17}/></div><div><b>{d.name}</b><small>{d.type} · {d.size}</small></div></div><select className="row-select" value={d.collection_id || ""} onChange={e=>void moveDocument(d,e.target.value)} aria-label="Move document"><option value="">Unsorted</option>{collections.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><span className="updated-cell">{d.updated}</span><span><i className={d.status==="Ready"?"status ready":"status processing"}/>{d.status}</span><div className="row-actions"><button title="Preview extracted text" onClick={()=>void openDocument(d)}><FileText size={16}/></button><button title="Download original" onClick={()=>void downloadDocument(d)}><Download size={16}/></button><button title="Delete document" onClick={async()=>{if(!window.confirm("Delete "+d.name+" permanently?"))return;const {error}=await supabase.storage.from("documents").remove([d.storage_path]);if(!error){const result=await supabase.from("documents").delete().eq("id",d.id);if(result.error)setNotice(result.error.message);else{await loadWorkspace(user.id);setNotice("Document deleted.");}}else setNotice(error.message);}}><Trash2 size={16}/></button></div></div>) : <div className="empty-state"><UploadCloud size={22}/><p>No documents yet. Add a PDF or DOCX to get started.</p></div>}</div>
        <div className="bottom-note"><ShieldCheck size={15}/> Private files · User-scoped database access · No paid AI API connected</div>
      </div>
    </section>
  </main>;
}

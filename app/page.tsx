"use client";

import { useMemo, useState } from "react";
import { Search, Plus, FileText, FolderOpen, LayoutDashboard, Settings, Bell, ChevronDown, MoreHorizontal, UploadCloud, Sparkles, Clock3, ShieldCheck, ArrowUpRight, File, Menu, X, Command, Filter, BookOpen, PanelLeftClose } from "lucide-react";

type Doc = { id: number; name: string; type: string; size: string; updated: string; status: "Ready" | "Processing"; collection: string; color: string };
const starterDocs: Doc[] = [
  { id: 1, name: "Research methodology.pdf", type: "PDF", size: "2.4 MB", updated: "Today, 10:42 AM", status: "Ready", collection: "Research", color: "violet" },
  { id: 2, name: "Project proposal.docx", type: "DOCX", size: "846 KB", updated: "Yesterday", status: "Ready", collection: "Research", color: "blue" },
  { id: 3, name: "Market analysis 2026.pdf", type: "PDF", size: "5.1 MB", updated: "Oct 29, 2026", status: "Ready", collection: "Business", color: "orange" },
  { id: 4, name: "Literature review.pdf", type: "PDF", size: "1.8 MB", updated: "Oct 27, 2026", status: "Processing", collection: "Research", color: "violet" }
];

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<Doc[]>(starterDocs);
  const [collection, setCollection] = useState("All documents");
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const filtered = useMemo(() => docs.filter(d => (collection === "All documents" || d.collection === collection) && d.name.toLowerCase().includes(query.toLowerCase())), [docs, collection, query]);
  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const accepted = Array.from(files).filter(f => /\.(pdf|docx)$/i.test(f.name));
    if (!accepted.length) { setNotice("Please choose PDF or DOCX files."); return; }
    const next = accepted.map((f, i) => ({ id: Date.now() + i, name: f.name, type: f.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX", size: f.size > 1048576 ? (f.size / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(f.size / 1024)) + " KB", updated: "Just now", status: "Processing" as const, collection: "Unsorted", color: "blue" }));
    setDocs(old => [...next, ...old]); setNotice(accepted.length + " file(s) added to this preview. Connect your account to save and process them."); setActive("Documents");
  }
  return <main className="shell">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Command size={19}/></div><span>docu<span className="brand-light">mind</span></span><button className="mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace"><div className="workspace-avatar">D</div><div><b>Personal workspace</b><small>Free plan</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{[{name:"Overview",icon:LayoutDashboard},{name:"Documents",icon:FileText},{name:"Collections",icon:FolderOpen}].map(n => <button key={n.name} className={active===n.name?"nav-item selected":"nav-item"} onClick={()=>{setActive(n.name);setMobileNav(false)}}><n.icon size={17}/>{n.name}{n.name==="Documents"&&<span className="nav-count">{docs.length}</span>}</button>)}</nav>
      <div className="nav-label collection-label">YOUR COLLECTIONS <button onClick={()=>setNotice("Collection creation will be enabled after account setup.")}><Plus size={14}/></button></div>
      <button className="collection-link" onClick={()=>{setCollection("Research");setActive("Documents")}}><span className="collection-dot purple"/>Research</button>
      <button className="collection-link" onClick={()=>{setCollection("Business");setActive("Documents")}}><span className="collection-dot orange"/>Business</button>
      <button className="collection-link" onClick={()=>{setCollection("All documents");setActive("Documents")}}><span className="collection-dot gray"/>Unsorted</button>
      <div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={17}/><div><b>Your files stay yours</b><small>Private storage, built for trust.</small></div></div><button className="nav-item" onClick={()=>setNotice("Settings will be available after authentication is connected.")}><Settings size={17}/>Settings</button><div className="profile"><div className="profile-avatar">A</div><div><b>Guest account</b><small>Not signed in</small></div><MoreHorizontal size={18}/></div></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={()=>setMobileNav(false)} aria-label="Close navigation"/>}
    <section className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumbs">Workspace <span>/</span> <b>{active}</b></div><div className="top-actions"><button className="icon-button" aria-label="Notifications" onClick={()=>setNotice("You're all caught up.")}><Bell size={18}/></button><div className="top-avatar">A</div></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow">MONDAY, NOVEMBER 2, 2026</div><h1>{active==="Overview"?"Good evening.":active}</h1><p className="subheading">{active==="Overview"?"Your knowledge, organised and ready to explore.":"Manage and explore the documents in your workspace."}</p></div><label className="primary-button"><Plus size={17}/> Add documents<input type="file" accept=".pdf,.docx" multiple onChange={e=>addFiles(e.target.files)} hidden/></label></div>
        {notice && <div className="notice" role="status">{notice}<button onClick={()=>setNotice("")}><X size={15}/></button></div>}
        <div className="stats-grid"><div className="stat-card"><div className="stat-icon lavender"><FileText size={18}/></div><span>Total documents</span><strong>{docs.length}</strong><small>In this workspace</small></div><div className="stat-card"><div className="stat-icon mint"><FolderOpen size={18}/></div><span>Collections</span><strong>2</strong><small>Organised knowledge</small></div><div className="stat-card"><div className="stat-icon peach"><Sparkles size={18}/></div><span>Ready to ask</span><strong>{docs.filter(d=>d.status==="Ready").length}</strong><small>Documents indexed</small></div></div>
        <section className="ask-card"><div className="ask-icon"><Sparkles size={19}/></div><div className="ask-copy"><h2>Ask your documents</h2><p>Find answers across your files, with evidence you can verify.</p></div><button className="ask-button" onClick={()=>setNotice("Document chat becomes available after secure sign-in and processing are connected.")}>Start asking <ArrowUpRight size={16}/></button><div className="ask-glow"/></section>
        <div className="section-heading"><div><h2>Recent documents</h2><p>Your latest additions and updates</p></div><button className="text-button" onClick={()=>{setActive("Documents");setCollection("All documents")}}>View all <ArrowUpRight size={15}/></button></div>
        <div className="toolbar"><div className="searchbox"><Search size={17}/><input placeholder="Search documents..." value={query} onChange={e=>setQuery(e.target.value)}/><kbd>⌘ K</kbd></div><button className="filter-button" onClick={()=>setNotice("Showing documents in " + collection)}><Filter size={16}/> {collection}</button></div>
        <div className="document-table"><div className="table-head"><span>NAME</span><span>COLLECTION</span><span>LAST UPDATED</span><span>STATUS</span><span></span></div>{filtered.length ? filtered.map(d=><div className="document-row" key={d.id}><div className="file-name"><div className={`file-icon ${d.color}`}><File size={17}/></div><div><b>{d.name}</b><small>{d.type} · {d.size}</small></div></div><span className="collection-cell">{d.collection}</span><span className="updated-cell">{d.updated}</span><span><i className={d.status==="Ready"?"status ready":"status processing"}/>{d.status}</span><button className="row-more" onClick={()=>setNotice(d.name + " · " + d.status)} aria-label={"More options for "+d.name}><MoreHorizontal size={18}/></button></div>) : <div className="empty-state">No documents match your search.</div>}</div>
        <div className="bottom-note"><ShieldCheck size={15}/> Evidence-first answers. Every claim should lead back to its source.</div>
      </div>
    </section>
  </main>;
}
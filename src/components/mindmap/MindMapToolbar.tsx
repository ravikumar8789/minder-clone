import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

type Props = {
  docTitle: string
  onDocTitleCommit: (title: string) => void
  onBack: () => void
  onAddChild: () => void
  onDeleteNode: () => void
  onZoomFit: () => void
  canDeleteNode: boolean
}

export function MindMapToolbar({
  docTitle,
  onDocTitleCommit,
  onBack,
  onAddChild,
  onDeleteNode,
  onZoomFit,
  canDeleteNode,
}: Props) {
  const { signOut } = useAuth()
  const [draft, setDraft] = useState(docTitle)

  useEffect(() => {
    setDraft(docTitle)
  }, [docTitle])

  return (
    <header className="mind-toolbar">
      <div className="mind-toolbar-left">
        <button type="button" className="mind-tool-btn" onClick={onBack} title="All maps">
          <IconMenu />
        </button>
        <span className="mind-toolbar-divider" />
        <button type="button" className="mind-tool-btn" title="Save" disabled>
          <IconSave />
        </button>
        <button type="button" className="mind-tool-btn" title="Undo" disabled>
          <IconUndo />
        </button>
        <button type="button" className="mind-tool-btn" title="Redo" disabled>
          <IconRedo />
        </button>
      </div>
      <div className="mind-toolbar-center">
        <input
          className="mind-doc-title"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const t = draft.trim() || 'Untitled.minder'
            setDraft(t)
            onDocTitleCommit(t)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          aria-label="Document title"
        />
        <span className="mind-doc-suffix">— Minder</span>
      </div>
      <div className="mind-toolbar-right">
        <button type="button" className="mind-tool-btn" title="Add branch" onClick={onAddChild}>
          <IconBranch />
        </button>
        <button
          type="button"
          className="mind-tool-btn"
          title="Delete node"
          onClick={onDeleteNode}
          disabled={!canDeleteNode}
        >
          <IconTrash />
        </button>
        <span className="mind-toolbar-divider" />
        <button type="button" className="mind-tool-btn" title="Zoom to fit" onClick={onZoomFit}>
          <IconFit />
        </button>
        <button type="button" className="mind-tool-btn" title="Search" disabled>
          <IconSearch />
        </button>
        <span className="mind-toolbar-divider" />
        <button
          type="button"
          className="mind-tool-btn mind-tool-signout"
          title="Sign out"
          onClick={() => void signOut()}
        >
          <IconSignOut />
        </button>
      </div>
    </header>
  )
}

function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function IconSave() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  )
}

function IconUndo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-15-6.7L3 13" />
    </svg>
  )
}

function IconRedo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0115-6.7L21 13" />
    </svg>
  )
}

function IconBranch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="12" r="2" />
      <circle cx="6" cy="18" r="2" />
      <path d="M8 6c4 0 4 6 8 6M8 18c4 0 4-6 8-6" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
    </svg>
  )
}

function IconFit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

function IconSignOut() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}

import { useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { SectionHead } from '../ui/Panel';
import { play } from '../state/audio';
import { APP_RELEASE, APP_VERSION, GAME_DATA_MANIFEST } from '../../domain/buildPersistence';
import { TEMPLATES } from '../state/build';
import type { Builder } from '../state/useBuilder';

/* ----------------------------------------------------------------- templates */

/** Starting spreads, read from the game dataset rather than invented here. */
export function TemplatesDialog({ builder, onClose }: { builder: Builder; onClose: () => void }) {
  const { dispatch, setBuildName, notify } = builder;

  const apply = (id: string, name: string) => {
    dispatch({ type: 'template', id });
    setBuildName(name);
    notify('good', `Loaded the ${name} template.`);
    onClose();
  };

  return (
    <Modal title="Starting Templates" onClose={onClose}>
      <div className="stack">
        {TEMPLATES.map(template => (
          <button
            key={template.id}
            type="button"
            className="card"
            style={{ padding: '11px 13px' }}
            onClick={() => apply(template.id, template.name)}
          >
            <span className="card__name">{template.name}</span>
            <span className="card__meta">
              {template.build.race} {template.build.subrace} · {template.build.mainClass} / {template.build.subClass}
              {template.build.history !== 'None' ? ` · ${template.build.history}` : ''}
            </span>
            <span className="card__desc">{template.description}</span>
            <span className="card__desc dim" style={{ marginTop: 4 }}>{template.reasoning}</span>
          </button>
        ))}

        <div className="divider" />

        <button
          type="button"
          className="card"
          style={{ padding: '11px 13px' }}
          onClick={() => {
            dispatch({ type: 'reset' });
            setBuildName('New Character');
            notify('info', 'Sheet cleared.');
            onClose();
          }}
        >
          <span className="card__name">Blank Sheet</span>
          <span className="card__desc">A level 60 Human Imperialist Soldier with no points spent.</span>
        </button>
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------------------- saves */

export function SavesDialog({ builder, onClose }: { builder: Builder; onClose: () => void }) {
  const { saves, saveAs, overwrite, loadSlot, deleteSlot, buildName } = builder;
  const [name, setName] = useState(buildName);
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <Modal
      title="Saved Builds"
      onClose={onClose}
      footer={
        <>
          <input
            className="input"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Build name"
            aria-label="Name for the new save"
          />
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => { saveAs(name); onClose(); }}
          >
            Save as new
          </button>
        </>
      }
    >
      {saves.length === 0 ? (
        <div className="empty">
          <span className="eyebrow">No builds saved</span>
          <span>Saved builds live in this browser. Export JSON to keep one elsewhere.</span>
        </div>
      ) : (
        <div className="stack--tight">
          {saves.map(slot => (
            <div className="entry" key={slot.id} style={{ padding: '9px 11px' }}>
              <div className="entry__main">
                <div className="entry__name">{slot.name}</div>
                <div className="entry__sub">
                  {slot.build.race} {slot.build.subrace} · {slot.build.mainClass} / {slot.build.subClass}
                  {' · '}Lv {slot.build.characterLevel}
                  {' · '}saved {new Date(slot.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="entry__rank">
                <button type="button" className="btn btn--ghost btn--icon" onClick={() => { loadSlot(slot.id); onClose(); }}>
                  Load
                </button>
                <button type="button" className="btn btn--ghost btn--icon" onClick={() => overwrite(slot.id)}>
                  Update
                </button>
                {confirming === slot.id ? (
                  <button
                    type="button"
                    className="btn btn--danger btn--icon"
                    onClick={() => { deleteSlot(slot.id); setConfirming(null); }}
                  >
                    Confirm
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon btn--danger"
                    onClick={() => { play('back'); setConfirming(slot.id); }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ transfer */

/**
 * Import and export, sharing the calculator's own build file format: a build
 * exported here opens in the original SL2 Calculator and the other way round.
 */
export function TransferDialog({ builder, onClose }: { builder: Builder; onClose: () => void }) {
  const { exportJSON, importJSON, downloadJSON, notify, shareLink, shareCode } = builder;
  const [text, setText] = useState(() => exportJSON());
  const fileRef = useRef<HTMLInputElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      notify('good', 'Build JSON copied.');
    } catch {
      notify('bad', 'Clipboard blocked. Select the text and copy manually.');
    }
  };

  /*
   * A link, not a file. The fragment carries the whole build compressed, which is
   * how the original calculator shares one, so a link made here opens there.
   */
  const copyLink = async () => {
    const result = shareLink();
    if ('error' in result) {
      notify('bad', result.error);
      return;
    }
    try {
      await navigator.clipboard.writeText(result.url);
      notify('good', 'Share link copied.');
    } catch {
      notify('bad', 'Clipboard blocked. Use Download instead.');
    }
  };

  const copyCode = async () => {
    const code = shareCode();
    if (!code) {
      notify('bad', 'This build is too large to encode. Use the JSON below.');
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      notify('good', 'Build code copied.');
    } catch {
      notify('bad', 'Clipboard blocked. Use the JSON below.');
    }
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    const contents = await file.text();
    setText(contents);
    importJSON(contents);
  };

  return (
    <Modal
      title="Import / Export"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={() => setText(exportJSON())}>Refresh</button>
          <button type="button" className="btn" onClick={copy}>Copy</button>
          <button type="button" className="btn" onClick={downloadJSON}>Download</button>
          <div className="spacer" />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Open file…</button>
          <button type="button" className="btn btn--primary" onClick={() => importJSON(text)}>Import</button>
        </>
      }
    >
      <SectionHead aside="one link">Share</SectionHead>
      <div className="inline" style={{ gap: 6, padding: '2px 0 11px', flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={() => void copyLink()}>Copy share link</button>
        <button type="button" className="btn btn--ghost btn--icon" onClick={() => void copyCode()}>
          Copy build code
        </button>
        <span className="hint" style={{ flex: 1, minWidth: 140 }}>
          Share links open in Aether or the classic calculator.
        </span>
      </div>

      <SectionHead aside="schema v1">File</SectionHead>
      <p className="hint" style={{ margin: '2px 0 9px' }}>
        Paste build JSON or open a <span className="num">.json</span> file. Aether uses the same format as the classic calculator.
      </p>
      <textarea
        className="code scroll"
        value={text}
        spellCheck={false}
        onChange={event => setText(event.target.value)}
        aria-label="Build JSON"
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={event => void readFile(event.target.files?.[0])}
      />
    </Modal>
  );
}

/* ----------------------------------------------------------------- shortcuts */

/** Every shortcut the sheet answers to, grouped by what it acts on. */
const SHORTCUTS: Array<{ group: string; rows: Array<[keys: string[], what: string]> }> = [
  {
    group: 'Attributes',
    rows: [
      [['Tab'], 'Move between attribute rows. The steppers inside a row are skipped on purpose'],
      [['←', '→'], 'Spend and refund a point'],
      [['Shift', '←/→'], 'Ten points at a time'],
      [['Home'], 'Empty the stat'],
      [['End'], 'Fill it to its cap'],
    ],
  },
  {
    group: 'Lists',
    rows: [
      [['↑', '↓'], 'Move through lists'],
      [['W', 'S'], 'Move through lists with one hand'],
      [['Enter'], 'Activate the focused row'],
      [['Space'], 'Activate the focused row'],
      [['I'], 'Read the focused skill or Youkai’s details'],
    ],
  },
  {
    group: 'Dialogs',
    rows: [
      [['T'], 'Starting templates'],
      [['B'], 'Saved builds'],
      [['E'], 'Import / export'],
      [['A'], 'Advanced overrides'],
      [['?'], 'This list'],
      [['Esc'], 'Close whatever is open'],
    ],
  },
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard" onClose={onClose}>
      <p className="hint" style={{ marginBottom: 9 }}>
        Letter shortcuts pause while you type in a field.
      </p>
      {SHORTCUTS.map(section => (
        <div className="section" key={section.group}>
          <SectionHead>{section.group}</SectionHead>
          <div className="stack--tight">
            {section.rows.map(([keys, what]) => (
              <div className="keyrow" key={keys.join('+')}>
                <span className="keyrow__keys">
                  {keys.map(key => <span className="keycap" key={key}>{key}</span>)}
                </span>
                <span className="keyrow__what">{what}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Modal>
  );
}

/* ----------------------------------------------------------------- changelog */

/**
 * What this release and the current dataset changed.
 *
 * Both lists are here because the badge that opens this dialog carries both
 * numbers, and they move for different reasons: the app notes say what the sheet
 * can do, the data notes say how current its numbers are. A build saved before
 * either kind of change is worth re-reading after one.
 */
export function ChangesDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="What's new" onClose={onClose}>
      <div className="inline" style={{ gap: 5, marginBottom: 9 }}>
        <span className="chip chip--gold">App v{APP_VERSION}</span>
        <span className="chip">Data {GAME_DATA_MANIFEST.dataVersion}</span>
      </div>

      <p className="eyebrow" style={{ marginBottom: 5 }}>This release</p>
      <p className="hint" style={{ marginBottom: 7 }}>{APP_RELEASE.headline}</p>
      <ul className="changes">
        {APP_RELEASE.notes.map(note => <li key={note}>{note}</li>)}
      </ul>

      <div className="divider" />

      <p className="eyebrow" style={{ marginBottom: 5 }}>Game data {GAME_DATA_MANIFEST.dataVersion}</p>
      {GAME_DATA_MANIFEST.changes.length === 0 ? (
        <p className="hint">This dataset records no changes.</p>
      ) : (
        <ul className="changes">
          {GAME_DATA_MANIFEST.changes.map(change => <li key={change}>{change}</li>)}
        </ul>
      )}
    </Modal>
  );
}

/* --------------------------------------------------------------- shared build */

/**
 * A build arriving by link, offered rather than applied.
 *
 * A dialog because accepting replaces the sheet: an inline banner is easy to click
 * past, and the visitor's own unsaved work is behind it. The dataset the link was
 * made against is named when it differs from this one: the numbers move when the
 * data does, and a stale link is worth knowing about before loading it.
 */
export function SharedBuildDialog({ builder, onClose }: { builder: Builder; onClose: () => void }) {
  const { pendingShare, acceptShare, dismissShare } = builder;
  if (!pendingShare) return null;

  const stale = Boolean(pendingShare.dataVersion) && pendingShare.dataVersion !== GAME_DATA_MANIFEST.dataVersion;

  return (
    <Modal
      title="Shared build"
      onClose={() => { dismissShare(); onClose(); }}
      footer={
        <>
          <button
            type="button"
            className="btn"
            onClick={() => { play('back'); dismissShare(); onClose(); }}
          >
            Keep my sheet
          </button>
          <div className="spacer" />
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => { play('confirm'); acceptShare(); onClose(); }}
          >
            Load this build
          </button>
        </>
      }
    >
      <p className="hint" style={{ marginBottom: 9 }}>
        Loading this build replaces your current sheet. Save it first if you want to keep it.
      </p>
      <div className="inline" style={{ gap: 5, flexWrap: 'wrap' }}>
        <span className="chip chip--gold">{pendingShare.buildName}</span>
        <span className="chip">{pendingShare.build.race} {pendingShare.build.subrace}</span>
        <span className="chip">
          {pendingShare.build.mainClass}
          {pendingShare.build.mainClass === pendingShare.build.subClass
            ? ' · monoclass'
            : ` / ${pendingShare.build.subClass}`}
        </span>
        <span className="chip">Level {pendingShare.build.characterLevel}</span>
      </div>
      {stale ? (
        <p className="hint" style={{ marginTop: 9, color: 'var(--alert)' }}>
          Saved with data {pendingShare.dataVersion}. Current data is {GAME_DATA_MANIFEST.dataVersion}; stats may change after loading.
        </p>
      ) : null}
    </Modal>
  );
}

import { useState } from 'react';
import { Copy, Download, Share2, Upload } from 'lucide-react';
import { TEMPLATE_BUILDS } from './data/constants';
import { cx } from './design';
import DeckDialog, { DialogSection } from './DeckDialog';
import { DeckLabel } from './CommandDeck';
import type { BuildState, SaveSlotV1 } from './types';

/** Everything the dialog can ask the parent to do. */
export interface ImportExportActions {
  exportBuild: (name?: string) => void;
  downloadBuild: (name: string, build: BuildState) => void;
  importBuild: (jsonString: string) => boolean;
  loadTemplate: (templateKey: string) => void;
  copyBuildToClipboard: (name?: string) => Promise<boolean>;
  copyShareLink: () => Promise<void>;
  shareBuild: () => Promise<void>;
  createSaveSlot: () => void;
  updateActiveSave: () => void;
  loadNamedSave: (slot: SaveSlotV1) => void;
  duplicateSave: (slot: SaveSlotV1) => void;
  deleteSave: (slot: SaveSlotV1) => void;
  restoreDraft: () => void;
  discardDraft: () => void;
}

export interface ImportExportDialogProps {
  onClose: () => void;
  on: ImportExportActions;
  buildName: string;
  onBuildNameChange: (name: string) => void;
  saveSlots: SaveSlotV1[];
  activeSaveId: string | null;
  draftTimestamp: string | null;
}

/** Primary action — the design's one periwinkle button. */
const PRIMARY = 'flex items-center gap-2 rounded-8 bg-info-bg px-3.5 py-2 text-12 font-semibold text-content transition-colors hover:bg-info-edge disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-content-ghost';
/** Everything else is neutral chrome that raises its border on hover. */
const SECONDARY = 'flex items-center gap-2 rounded-8 border border-edge px-3 py-2 text-12 text-content-secondary transition-colors hover:border-edge-emphasis hover:text-content disabled:cursor-not-allowed disabled:opacity-40';
const FIELD = 'w-full rounded-7 border border-edge bg-surface-bar px-3 py-2 text-13 text-content outline-none transition-colors placeholder:text-content-ghost hover:border-edge-strong focus:border-edge-emphasis';

/**
 * Import / export, share links, named save slots and the recovery draft.
 *
 * The twelve parent handlers are grouped behind `on` rather than passed flat;
 * `importText` was only ever read here, so it became local state.
 *
 * Restyled onto `DeckDialog`: it was the last screen still wearing the old modal
 * — a `bg-black/75` backdrop, one saturated button colour per action, and no
 * keyboard handling. Per the style guide chrome is neutral, so the accent now
 * marks only the primary action in each section.
 */
export default function ImportExportDialog({
  onClose,
  on,
  buildName,
  onBuildNameChange,
  saveSlots,
  activeSaveId,
  draftTimestamp,
}: ImportExportDialogProps) {
  const [importText, setImportText] = useState('');

  return (
    <DeckDialog
      title="Saves & Sharing"
      onClose={onClose}
      sections={[
        { id: 'export', label: 'Export' },
        { id: 'saves', label: 'Local saves' },
        { id: 'import', label: 'Import' },
        { id: 'templates', label: 'Templates' },
      ]}
    >
      <DialogSection id="export" title="Export build">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={buildName}
            onChange={event => onBuildNameChange(event.target.value)}
            placeholder="Build name (optional)"
            aria-label="Build name"
            className={cx(FIELD, 'sm:flex-1')}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => on.exportBuild(buildName)} className={PRIMARY}>
              <Download size={14} aria-hidden="true" /> Download JSON
            </button>
            <button type="button" onClick={() => on.copyBuildToClipboard(buildName)} className={SECONDARY}>
              <Copy size={14} aria-hidden="true" /> Copy build
            </button>
            <button type="button" onClick={on.copyShareLink} className={SECONDARY}>
              <Copy size={14} aria-hidden="true" /> Copy share link
            </button>
            <button type="button" onClick={on.shareBuild} className={SECONDARY}>
              <Share2 size={14} aria-hidden="true" /> Share
            </button>
          </div>
        </div>
      </DialogSection>

      <DialogSection
        id="saves"
        title="Local saves"
        hint="Named saves change only when you explicitly update them."
      >
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={on.createSaveSlot} className={PRIMARY}>Create named save</button>
          <button type="button" onClick={on.updateActiveSave} disabled={!activeSaveId} className={SECONDARY}>
            Update save
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-9 border border-caution/40 bg-surface-bar p-3">
          <div className="flex flex-col gap-0.5">
            <DeckLabel className="text-caution">Recovery draft</DeckLabel>
            <span className="font-mono text-11 text-content-faint">
              {draftTimestamp ? `Last saved ${new Date(draftTimestamp).toLocaleString()}` : 'No recovery draft available'}
            </span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={on.restoreDraft} disabled={!draftTimestamp} className={SECONDARY}>Restore</button>
            <button
              type="button"
              onClick={on.discardDraft}
              disabled={!draftTimestamp}
              className={cx(SECONDARY, 'hover:border-negative hover:text-negative')}
            >
              Discard
            </button>
          </div>
        </div>

        {saveSlots.length === 0 ? (
          <p className="text-12 text-content-faint">No named saves yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {saveSlots.map(slot => {
              const loaded = activeSaveId === slot.id;
              return (
                <div
                  key={slot.id}
                  className={cx(
                    'flex flex-col gap-2.5 rounded-9 border p-3 transition-colors',
                    loaded ? 'border-info bg-info-bg/30' : 'border-edge bg-surface-bar hover:border-edge-emphasis',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-13 font-semibold text-content-bright">{slot.name}</span>
                      <span className="font-mono text-10 text-content-ghost">
                        Updated {new Date(slot.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    {loaded && (
                      <span className="shrink-0 rounded-6 bg-info-bg px-2 py-0.5 text-10 font-semibold text-content">
                        Loaded
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => on.loadNamedSave(slot)} className={cx(SECONDARY, 'px-2 py-1 text-11')}>Load</button>
                    <button type="button" onClick={() => on.duplicateSave(slot)} className={cx(SECONDARY, 'px-2 py-1 text-11')}>Duplicate</button>
                    <button type="button" onClick={() => on.downloadBuild(slot.name, slot.build)} className={cx(SECONDARY, 'px-2 py-1 text-11')}>Export</button>
                    <button
                      type="button"
                      onClick={() => on.deleteSave(slot)}
                      aria-label={`Delete save ${slot.name}`}
                      className={cx(SECONDARY, 'px-2 py-1 text-11 hover:border-negative hover:text-negative')}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogSection>

      <DialogSection id="import" title="Import build">
        <textarea
          value={importText}
          onChange={event => setImportText(event.target.value)}
          placeholder="Paste build JSON here…"
          rows={4}
          aria-label="Build JSON"
          className={cx(FIELD, 'resize-y font-mono text-12 leading-relaxed')}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => on.importBuild(importText)}
            disabled={!importText.trim()}
            className={PRIMARY}
          >
            <Upload size={14} aria-hidden="true" /> Import from text
          </button>
          <input
            type="file"
            accept=".json"
            onChange={event => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = loaded => on.importBuild(loaded.target?.result as string);
              reader.readAsText(file);
            }}
            className="hidden"
            id="import-file"
          />
          <label htmlFor="import-file" className={cx(SECONDARY, 'cursor-pointer')}>
            <Upload size={14} aria-hidden="true" /> Import from file
          </label>
        </div>
      </DialogSection>

      <DialogSection id="templates" title="Template builds" hint="Load a starting point, then tune it.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(TEMPLATE_BUILDS).map(([key, template]) => (
            <div
              key={key}
              title={template.reasoning}
              className="flex flex-col gap-2 rounded-9 border border-edge bg-surface-bar p-3 transition-colors hover:border-edge-emphasis"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-12 font-semibold text-content-bright">{template.name}</span>
                <button
                  type="button"
                  onClick={() => on.loadTemplate(key)}
                  aria-label={`Load the ${template.name} template`}
                  className="shrink-0 rounded-6 bg-info-bg px-2 py-0.5 text-10 font-semibold text-content transition-colors hover:bg-info-edge"
                >
                  Load
                </button>
              </div>
              <p className="text-10 leading-relaxed text-content-faint">{template.description}</p>
            </div>
          ))}
        </div>
      </DialogSection>
    </DeckDialog>
  );
}

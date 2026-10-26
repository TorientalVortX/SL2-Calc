import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { play } from '../state/audio';
import type { Builder } from '../state/useBuilder';
import { IncomingPanel } from './damage/IncomingPanel';
import { OutgoingPanel } from './damage/OutgoingPanel';

type Side = 'incoming' | 'outgoing';

export function DamageDialog({ builder, onClose, initialSkillId }: { builder: Builder; onClose: () => void; initialSkillId?: string }) {
  const [side, setSide] = useState<Side>(initialSkillId === undefined ? 'incoming' : 'outgoing');
  return (
    <Modal title={side === 'incoming' ? 'Incoming damage' : 'Outgoing damage'} onClose={onClose}>
      <div className="tabs" style={{ marginBottom: 10 }}>
        {(['incoming', 'outgoing'] as const).map(entry => (
          <button
            key={entry}
            type="button"
            className={`tab ${side === entry ? 'is-active' : ''}`}
            aria-pressed={side === entry}
            onClick={() => { play('select'); setSide(entry); }}
          >
            {entry}
          </button>
        ))}
      </div>
      {side === 'incoming' ? <IncomingPanel builder={builder} /> : <OutgoingPanel builder={builder} initialSkillId={initialSkillId} />}
    </Modal>
  );
}

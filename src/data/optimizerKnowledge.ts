import knowledgeData from './content/optimizer-knowledge.json';

export type OptimizerKnowledge = typeof knowledgeData;
export const OPTIMIZER_KNOWLEDGE = knowledgeData;

export const CLASS_PAIR_EVIDENCE = Object.fromEntries(
  knowledgeData.classPairEvidence.map(item => [`${item.mainClass}::${item.subClass}`, item]),
);

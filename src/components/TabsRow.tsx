import React from 'react';
import { CASE_STUDIES, type CaseStudyId } from '../caseStudies/config';

interface TabsRowProps {
  activeCaseStudy: CaseStudyId;
  onChange: (next: CaseStudyId) => void;
}

const CASE_STUDY_OPTIONS: Array<{ id: CaseStudyId; label: string }> = [
  { id: 'CS1', label: CASE_STUDIES.CS1.tabLabel },
  { id: 'CS2', label: CASE_STUDIES.CS2.tabLabel },
  { id: 'CS3', label: CASE_STUDIES.CS3.tabLabel },
  { id: 'CS4', label: CASE_STUDIES.CS4.tabLabel },
];

const TabsRow: React.FC<TabsRowProps> = ({ activeCaseStudy, onChange }) => {
  return (
    <div className="caseSelectorBar" role="tablist" aria-label="Use Case Selector">
      {CASE_STUDY_OPTIONS.map((option) => {
        const selected = activeCaseStudy === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`caseSelectorBtn ${selected ? 'active' : ''}`}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default TabsRow;

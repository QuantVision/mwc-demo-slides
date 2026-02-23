import React from 'react';

interface CaseStudy2PlaceholderProps {
  title: string;
  body: string;
  variant?: 'panel' | 'topology';
}

const CaseStudy2Placeholder: React.FC<CaseStudy2PlaceholderProps> = ({ title, body, variant = 'panel' }) => {
  return (
    <section className={variant === 'topology' ? 'topology-panel' : 'dashboard-pane'}>
      <div className={variant === 'topology' ? 'topology-panel-inner cs2-shell' : 'pane-body cs2-shell'}>
        <h3 className="cs2-title">{title}</h3>
        <p className="cs2-body">{body}</p>
      </div>
    </section>
  );
};

export default CaseStudy2Placeholder;

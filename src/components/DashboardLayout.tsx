import React from 'react';

interface DashboardLayoutProps {
  header: React.ReactNode;
  tabsRow: React.ReactNode;
  topology: React.ReactNode;
  narrative: React.ReactNode;
  metricsPane: React.ReactNode;
  workflowPane: React.ReactNode;
  eventsPane: React.ReactNode;
  partnersStrip: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  header,
  tabsRow,
  topology,
  narrative,
  metricsPane,
  workflowPane,
  eventsPane,
  partnersStrip,
}) => {
  return (
    <main className="dashboard-layout">
      <section className="layout-header">{header}</section>
      <section className="layout-tabs">{tabsRow}</section>
      <div className="layout-main">
        <section className="layout-topology">{topology}</section>
        <div className="layout-right-column">
          <div className="layout-narrative-area">{narrative}</div>
          <div className="layout-bottom-panes">
            {metricsPane}
            {workflowPane}
            {eventsPane}
          </div>
        </div>
      </div>
      <section className="layout-partners">{partnersStrip}</section>
    </main>
  );
};

export default DashboardLayout;

const RECLAMATION_ABOUT = 'https://www.usbr.gov/pn/grandcoulee/about/index.html';
const RECLAMATION_FACTS = 'https://www.usbr.gov/pn/grandcoulee/pubs/factsheet.pdf';
const RECLAMATION_CULTURAL = 'https://www.usbr.gov/pn/grandcoulee/history/cultural/index.html';
const NPS_HISTORY = 'https://www.nps.gov/laro/learn/historyculture/index.htm';

export function InterpretiveDepth() {
  return <section className="interpretive-section" aria-labelledby="interpretive-heading">
    <div className="interpretive-intro">
      <span className="eyebrow">HOW GRAND COULEE WORKS</span>
      <h2 id="interpretive-heading">More than a dam. More than a power plant.</h2>
      <p>Grand Coulee is simultaneously a hydropower complex, reservoir-control structure and the pumping heart of the Columbia Basin Project. Understanding it also requires understanding what the project changed upstream.</p>
    </div>

    <div className="interpretive-grid">
      <article>
        <span className="interpretive-number">01</span>
        <h3>Three powerhouse areas</h3>
        <p>The original Left and Right Powerhouses flank the central spillway. The Nathaniel “Nat” Washington Power Plant—the Third Power Plant—added six very large units on the right bank. Together with the pump-generating plant, Reclamation lists 6,809 MW of total generating capacity.</p>
        <a href={RECLAMATION_FACTS} target="_blank" rel="noreferrer">Reclamation technical facts</a>
      </article>

      <article>
        <span className="interpretive-number">02</span>
        <h3>The spillway is a separate pathway</h3>
        <p>Water routed through generators can produce electricity. Spill bypasses the turbines. Grand Coulee’s central spillway uses 11 drum gates and is physically distinct from powerhouse flow, which is why this tool never treats total outflow as spill.</p>
        <a href="https://www.usbr.gov/pn/grandcoulee/about/faq.html" target="_blank" rel="noreferrer">Reclamation spillway FAQ</a>
      </article>

      <article>
        <span className="interpretive-number">03</span>
        <h3>Water also goes uphill</h3>
        <p>The John W. Keys III Pump-Generating Plant lifts Columbia River water from Lake Roosevelt toward Banks Lake. From there the Columbia Basin Project distributes irrigation water across central Washington. The reversible units can also generate electricity under appropriate operating conditions.</p>
        <a href={RECLAMATION_ABOUT} target="_blank" rel="noreferrer">Reclamation project overview</a>
      </article>

      <article>
        <span className="interpretive-number">04</span>
        <h3>Lake Roosevelt is an operating reservoir</h3>
        <p>The reservoir is not held at one fixed elevation. Flood-risk management, downstream flow requirements, hydropower and irrigation operations all contribute to changing water levels. That is why the live waterline and the full-pool comparison matter to visitors.</p>
        <a href={RECLAMATION_ABOUT} target="_blank" rel="noreferrer">Grand Coulee project information</a>
      </article>
    </div>

    <div className="legacy-panel">
      <div>
        <span className="eyebrow">THE WHOLE RIVER STORY</span>
        <h2>Benefits came with permanent consequences.</h2>
      </div>
      <div className="legacy-copy">
        <p>Reclamation describes Grand Coulee as a multipurpose project supporting power generation, irrigation, flood control, river regulation and recreation. Those benefits transformed the economy and infrastructure of the Columbia Basin.</p>
        <p>The dam also blocked anadromous salmon from the upper Columbia. Reclamation and the National Park Service document the resulting loss of the historic Kettle Falls fishery, inundation of places along the river, and profound cultural and economic effects on the Confederated Tribes of the Colville Reservation, the Spokane Tribe and other Indigenous communities whose lives were tied to salmon and the river.</p>
        <div className="legacy-links">
          <a href={RECLAMATION_CULTURAL} target="_blank" rel="noreferrer">Reclamation cultural history</a>
          <a href={NPS_HISTORY} target="_blank" rel="noreferrer">NPS Lake Roosevelt history</a>
        </div>
      </div>
    </div>
  </section>;
}

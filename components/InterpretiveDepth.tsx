const RECLAMATION_ABOUT = 'https://www.usbr.gov/pn/grandcoulee/about/index.html';
const RECLAMATION_FACTS = 'https://www.usbr.gov/pn/grandcoulee/pubs/factsheet.pdf';
const RECLAMATION_CULTURAL = 'https://www.usbr.gov/pn/grandcoulee/history/cultural/index.html';
const NPS_HISTORY = 'https://www.nps.gov/laro/learn/historyculture/index.htm';

export function InterpretiveDepth() {
  return <section className="interpretive-section" aria-labelledby="interpretive-heading">
    <div className="interpretive-intro">
      <span className="eyebrow">LOOK A LITTLE CLOSER</span>
      <h2 id="interpretive-heading">There’s more happening here than water going through a dam.</h2>
      <p>When you stand below Grand Coulee, the concrete gets your attention first. Then you notice the real story: powerhouses on both sides, a working reservoir behind you, and a system that can move Columbia River water uphill.</p>
    </div>

    <div className="interpretive-grid">
      <article>
        <span className="interpretive-number">01</span>
        <h3>Start with the three powerhouse areas</h3>
        <p>The original Left and Right Powerhouses sit on either side of the spillway. Farther along the right bank, the Third Power Plant added six much larger units. Together with the pump-generating plant, the complex reaches 6,809 MW of generating capacity.</p>
        <a href={RECLAMATION_FACTS} target="_blank" rel="noreferrer">Reclamation technical facts</a>
      </article>

      <article>
        <span className="interpretive-number">02</span>
        <h3>The middle of the dam is not the powerhouse</h3>
        <p>Water through a powerhouse can make electricity. Water over the spillway bypasses the turbines entirely. Grand Coulee’s central spillway uses 11 drum gates, which is why total river flow and spill are two different things here.</p>
        <a href="https://www.usbr.gov/pn/grandcoulee/about/faq.html" target="_blank" rel="noreferrer">Reclamation spillway FAQ</a>
      </article>

      <article>
        <span className="interpretive-number">03</span>
        <h3>Here’s the surprise: water goes uphill</h3>
        <p>The John W. Keys III Pump-Generating Plant lifts water from Lake Roosevelt toward Banks Lake. From there, the Columbia Basin Project carries irrigation water across central Washington. Some of those big units can reverse direction and generate power too.</p>
        <a href={RECLAMATION_ABOUT} target="_blank" rel="noreferrer">Reclamation project overview</a>
      </article>

      <article>
        <span className="interpretive-number">04</span>
        <h3>Lake Roosevelt is meant to move</h3>
        <p>The lake behind the dam is not held at one perfect level. Flood management, downstream river needs, power and irrigation all influence its elevation. That’s why today’s lake level tells you something about the larger system.</p>
        <a href={RECLAMATION_ABOUT} target="_blank" rel="noreferrer">Grand Coulee project information</a>
      </article>
    </div>

    <div className="legacy-panel">
      <div>
        <span className="eyebrow">THE WHOLE RIVER STORY</span>
        <h2>Grand Coulee changed far more than the river’s elevation.</h2>
      </div>
      <div className="legacy-copy">
        <p>The project brought enormous amounts of power, irrigation water, flood management and recreation to the Columbia Basin. You can see the scale of those benefits all around you.</p>
        <p>But the same dam blocked salmon from the upper Columbia, inundated places along the river and deeply affected Indigenous communities whose lives and economies were tied to those fish and those places. A complete visit makes room for both truths.</p>
        <div className="legacy-links">
          <a href={RECLAMATION_CULTURAL} target="_blank" rel="noreferrer">Reclamation cultural history</a>
          <a href={NPS_HISTORY} target="_blank" rel="noreferrer">NPS Lake Roosevelt history</a>
        </div>
      </div>
    </div>
  </section>;
}

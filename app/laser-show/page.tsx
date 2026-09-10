import type { Metadata } from 'next';
import { DecisionIntentPage } from '@/components/DecisionIntentPage';
import { getGrandCouleeStatus } from '@/lib/status';

export const revalidate=600;
const canonical='https://chrisizworski.com/national-tools/grand-coulee/laser-show/';
export const metadata:Metadata={title:'Grand Coulee Laser Light Show Tonight | Time & Conditions',description:'See whether the Grand Coulee Dam laser light show is scheduled tonight, the show time, sunset and evening weather before you go.',alternates:{canonical},openGraph:{title:'Grand Coulee Laser Light Show Tonight',description:'Tonight’s laser-show status, time, sunset and weather at Grand Coulee Dam.',url:canonical}};

export default async function LaserShowPage(){
  const s=await getGrandCouleeStatus();
  const v=s.visitor,w=s.weather,a=s.astronomy;
  const status=v.laserStatus==='tonight'?'Scheduled tonight':v.laserStatus==='completed'?'Completed tonight':v.laserStatus==='off-season'?'Off season':'Verify schedule';
  const decision=v.laserStatus==='tonight' ? `${v.laserTime?`The laser show is scheduled for ${v.laserTime}. `:''}${v.laserDetail}` : v.laserDetail;
  const jsonLd={'@context':'https://schema.org','@graph':[{'@type':'WebPage',name:'Grand Coulee Laser Light Show Tonight',url:canonical,description:'Current laser-show timing and evening conditions at Grand Coulee Dam.'},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'National Tools',item:'https://chrisizworski.com/national-tools/'},{'@type':'ListItem',position:2,name:'Grand Coulee Live',item:'https://chrisizworski.com/national-tools/grand-coulee/'},{'@type':'ListItem',position:3,name:'Laser Light Show',item:canonical}]},{'@type':'FAQPage',mainEntity:[{'@type':'Question',name:'Is the Grand Coulee laser light show happening tonight?',acceptedAnswer:{'@type':'Answer',text:'This page reads the date-aware Bureau of Reclamation visitor schedule used by Grand Coulee Live and shows the current status rather than assuming the show runs every night.'}},{'@type':'Question',name:'What time is the Grand Coulee laser show?',acceptedAnswer:{'@type':'Answer',text:'The live panel shows the verified show time when one is available for the current date. Seasonal schedules can change, so the source status is checked before a time is displayed.'}},{'@type':'Question',name:'Does weather matter for the show?',acceptedAnswer:{'@type':'Answer',text:'Yes. This page places National Weather Service evening conditions beside the show schedule so visitors can judge rain, wind and visibility before driving to the dam.'}}]}]};
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/><DecisionIntentPage eyebrow="Grand Coulee visit planner" title="Laser light show tonight" dek="One page for the question visitors actually have: is the show running tonight, when does it start, and will the evening weather cooperate?" decision={decision||'The current Reclamation schedule could not be confirmed. Check the source before driving specifically for the show.'} metrics={[
    {label:'Show status',value:status,detail:v.sourcesHealthy?'Reclamation source checked':'Source verification delayed'},
    {label:'Show time',value:v.laserTime||'—',detail:v.laserTime?'Current date-aware schedule':'No verified time displayed'},
    {label:'Sunset',value:a.sunset||'—',detail:`Civil dusk ${a.civilDusk||'—'}`},
    {label:'Evening weather',value:w?.shortForecast||'—',detail:w?.eveningSummary||undefined}
  ]} links={[{href:'/national-tools/grand-coulee/tours/',label:'Tours & Visitor Center'},{href:'/national-tools/grand-coulee/lake-roosevelt-water-level/',label:'Lake Roosevelt water level'},{href:'/national-tools/grand-coulee/',label:'Full live dashboard'}]}>
    <h2 style={{fontFamily:'Georgia,serif',fontSize:30,color:'#173a32'}}>Plan the evening, not just the show</h2>
    <p>{v.laserDetail}</p>
    <p>The useful viewing decision is a combination of the verified seasonal schedule, darkness and weather. Sunset is <strong>{a.sunset}</strong>{w?.eveningSummary?<> and the current evening forecast is <strong>{w.eveningSummary}</strong></>:null}.</p>
    <p>This page does not infer a show from the calendar alone. If Reclamation schedule verification is delayed or the show is out of season, the status stays explicit instead of presenting a guessed time.</p>
  </DecisionIntentPage></>;
}

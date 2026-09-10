import type { Metadata } from 'next';
import { DecisionIntentPage } from '@/components/DecisionIntentPage';
import { getGrandCouleeStatus } from '@/lib/status';

export const revalidate=600;
const canonical='https://chrisizworski.com/national-tools/grand-coulee/tours/';
export const metadata:Metadata={title:'Grand Coulee Dam Tours Today | Visitor Center & Next Tour',description:'See Grand Coulee Dam tour times today, whether the visitor center is open, the next tour and current weather before you arrive.',alternates:{canonical},openGraph:{title:'Grand Coulee Dam Tours Today',description:'Visitor-center status, today’s tours, next tour and current conditions at Grand Coulee Dam.',url:canonical}};

export default async function ToursPage(){
  const s=await getGrandCouleeStatus();
  const v=s.visitor,w=s.weather;
  const center=v.visitorCenterStatus==='open'?'Open now':v.visitorCenterStatus==='closed'?'Closed now':'Verify status';
  const decision=v.nextTour?`${v.nextTourDetail}`:v.visitorCenterDetail;
  const tours=v.toursToday.length?v.toursToday.join(' · '):'No verified tour times listed';
  const jsonLd={'@context':'https://schema.org','@graph':[{'@type':'WebPage',name:'Grand Coulee Dam Tours Today',url:canonical,description:'Current visitor-center and tour planning information for Grand Coulee Dam.'},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'National Tools',item:'https://chrisizworski.com/national-tools/'},{'@type':'ListItem',position:2,name:'Grand Coulee Live',item:'https://chrisizworski.com/national-tools/grand-coulee/'},{'@type':'ListItem',position:3,name:'Tours',item:canonical}]},{'@type':'FAQPage',mainEntity:[{'@type':'Question',name:'Are Grand Coulee Dam tours running today?',acceptedAnswer:{'@type':'Answer',text:'This page uses the date-aware Bureau of Reclamation visitor schedule and shows today’s verified tour times when they are available.'}},{'@type':'Question',name:'Is the Grand Coulee Visitor Center open now?',acceptedAnswer:{'@type':'Answer',text:'The live status panel shows the current visitor-center state and schedule detail for the current date.'}},{'@type':'Question',name:'What should I check before going to Grand Coulee Dam?',acceptedAnswer:{'@type':'Answer',text:'Check the visitor-center and tour schedule, current weather and the full Grand Coulee Live dashboard for reservoir and river conditions.'}}]}]};
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/><DecisionIntentPage eyebrow="Grand Coulee visitor planning" title="Tours and Visitor Center today" dek="See whether the Visitor Center is open, what tours are scheduled today and which tour is next before you make the drive." decision={decision||'No verified next-tour detail is available right now. Use the current visitor-center status and official source before departure.'} metrics={[
    {label:'Visitor Center',value:center,detail:v.visitorCenterDetail},
    {label:'Next tour',value:v.nextTour||'—',detail:v.nextTourDetail||'No verified next tour'},
    {label:'Tours today',value:String(v.toursToday.length),detail:tours},
    {label:'Current weather',value:w?`${w.temperatureF??'—'}°F`:'—',detail:w?`${w.shortForecast} · ${w.windDirection} ${w.windSpeed}`:undefined}
  ]} links={[{href:'/national-tools/grand-coulee/laser-show/',label:'Laser light show tonight'},{href:'/national-tools/grand-coulee/lake-roosevelt-water-level/',label:'Lake Roosevelt water level'},{href:'/national-tools/grand-coulee/',label:'Full live dashboard'}]}>
    <h2 style={{fontFamily:'Georgia,serif',fontSize:30,color:'#173a32'}}>Today’s visit window</h2>
    <p>{v.visitorCenterDetail}</p>
    <p><strong>Verified tour schedule:</strong> {tours}.</p>
    <p>The schedule is date-aware. Grand Coulee Live does not carry a 2026 schedule forward into a future year without re-verifying it against Bureau of Reclamation information.</p>
  </DecisionIntentPage></>;
}

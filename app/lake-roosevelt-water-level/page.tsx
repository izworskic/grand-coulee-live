import type { Metadata } from 'next';
import { DecisionIntentPage } from '@/components/DecisionIntentPage';
import { getGrandCouleeStatus } from '@/lib/status';

export const revalidate=600;
const canonical='https://chrisizworski.com/national-tools/grand-coulee/lake-roosevelt-water-level/';
export const metadata:Metadata={title:'Lake Roosevelt Water Level Today | Grand Coulee Live',description:'See the current Lake Roosevelt elevation at Grand Coulee Dam, 24-hour change, distance below full pool, official forecast and Columbia River outflow.',alternates:{canonical},openGraph:{title:'Lake Roosevelt Water Level Today',description:'Current Lake Roosevelt elevation, trend, forecast and Grand Coulee outflow.',url:canonical}};
const n=(v:number|null,d=2)=>v==null?'—':v.toFixed(d);

export default async function LakeRooseveltPage(){
  const s=await getGrandCouleeStatus();
  const r=s.reservoir,f=s.lakeForecast,flow=s.flow;
  const trend=r.change24hFt==null?'24-hour trend unavailable':Math.abs(r.change24hFt)<0.01?'essentially steady over 24 hours':`${r.change24hFt>0?'up':'down'} ${Math.abs(r.change24hFt).toFixed(2)} ft over 24 hours`;
  const decision=r.forebayFt==null?'Current Lake Roosevelt elevation is temporarily unavailable.':`Lake Roosevelt is ${r.forebayFt.toFixed(2)} ft and ${trend}.`;
  const jsonLd={'@context':'https://schema.org','@graph':[{'@type':'WebPage',name:'Lake Roosevelt Water Level Today',url:canonical,description:'Measured Lake Roosevelt elevation, recent change, official forecast and Grand Coulee outflow.'},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'National Tools',item:'https://chrisizworski.com/national-tools/'},{'@type':'ListItem',position:2,name:'Grand Coulee Live',item:'https://chrisizworski.com/national-tools/grand-coulee/'},{'@type':'ListItem',position:3,name:'Lake Roosevelt Water Level',item:canonical}]},{'@type':'FAQPage',mainEntity:[{'@type':'Question',name:'What is the Lake Roosevelt water level today?',acceptedAnswer:{'@type':'Answer',text:'The live panel displays the latest measured Lake Roosevelt forebay elevation available from the Grand Coulee operational data feed, with freshness kept explicit.'}},{'@type':'Question',name:'Is Lake Roosevelt rising or falling?',acceptedAnswer:{'@type':'Answer',text:'The page calculates the recent change from operational observations and shows the 24-hour direction when enough current data are available.'}},{'@type':'Question',name:'Is the Lake Roosevelt forecast the same as the measured level?',acceptedAnswer:{'@type':'Answer',text:'No. The measured elevation and the Bureau of Reclamation provisional or predicted reservoir forecast are labeled separately so a forecast value is not presented as a current observation.'}}]}]};
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/><DecisionIntentPage eyebrow="Grand Coulee water intelligence" title="Lake Roosevelt water level today" dek="Measured reservoir elevation, recent movement, official forecast context and Columbia River outflow in one place." decision={decision} metrics={[
    {label:'Lake Roosevelt',value:r.forebayFt==null?'—':`${n(r.forebayFt)} ft`,detail:s.observedAt?`Observed ${new Date(s.observedAt).toLocaleString('en-US',{timeZone:'America/Los_Angeles'})}`:'Observation unavailable'},
    {label:'24-hour change',value:r.change24hFt==null?'—':`${r.change24hFt>0?'+':''}${n(r.change24hFt)} ft`,detail:trend},
    {label:'Below full pool',value:r.belowFullPoolFt==null?'—':`${n(r.belowFullPoolFt)} ft`,detail:`Full pool reference ${r.fullPoolFt.toFixed(0)} ft`},
    {label:'Current outflow',value:flow.totalOutflowKcfs==null?'—':`${n(flow.totalOutflowKcfs,1)} kcfs`,detail:s.recentRiver.signal||'Columbia River outflow at Grand Coulee'}
  ]} links={[{href:'/national-tools/grand-coulee/laser-show/',label:'Laser light show tonight'},{href:'/national-tools/grand-coulee/tours/',label:'Tours & Visitor Center'},{href:'/national-tools/grand-coulee/',label:'Full live dashboard'}]}>
    <h2 style={{fontFamily:'Georgia,serif',fontSize:30,color:'#173a32'}}>Measured now vs. forecast</h2>
    <p>The current operational observation is kept separate from the reservoir forecast. {r.forebayFt!=null?<>The latest measured elevation is <strong>{n(r.forebayFt)} ft</strong>.</>:<>The measured elevation is currently unavailable.</>}</p>
    {f?.nextElevationFt!=null?<p>The official reservoir forecast’s next value is <strong>{n(f.nextElevationFt)} ft</strong>{f.nextDate?` for ${f.nextDate}`:''}. Its final listed value is {f.finalElevationFt!=null?<strong>{n(f.finalElevationFt)} ft</strong>:'unavailable'}{f.finalDate?` for ${f.finalDate}`:''}.</p>:<p>No current Lake Roosevelt forecast value is being displayed.</p>}
    <p>{s.recentRiver.signal||'Recent river context is shown when enough daily and current observations are available.'}</p>
  </DecisionIntentPage></>;
}

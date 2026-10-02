import { round } from './common.mjs';
export function relationship(audio, events, tolerance=.12) {
  const nearest=(arr,t)=>arr?.length?arr.reduce((a,b)=>Math.abs(b-t)<Math.abs(a-t)?b:a):null;
  return { tolerance, units:'seconds; signed offsets = audio event minus visual event', rule:'Correspondence does not establish deliberate beat editing', events:events.map(e=>{
    const onset=nearest(audio.map?.onsets,e.t),beat=nearest(audio.map?.beats,e.t);
    return {...e,visual:e.kind,onsetOffset:onset===null?null:round(onset-e.t),beatOffset:beat===null?null:round(beat-e.t),tempoConfidence:audio.map?.tempo?.confidence??null,interpretation:onset!==null&&Math.abs(onset-e.t)<=tolerance?'near musical transient; deliberate synchronization unproven':'no close onset; the edit may follow meaning or motion'};
  }) };
}

function j(a=new Date){return new Date(a.getTime()-6048e5).toISOString().slice(0,10)}function C(a=new Date){return a.toISOString().slice(0,10)}function E({kid:a,completions:f=[],tasks:x=[],activities:b=[],streaks:m={},books:u=[],songPlays:y=[],gifted:d=[],practiceSessions:l=[],events:p=[],now:c=new Date}){var F;const g=j(c),t=C(c),n=e=>!!e&&e>=g&&e<=t,k=(f||[]).filter(e=>e.status==="approved"&&n(e.completionDate)),v=k.reduce((e,s)=>e+(Number(s.awardedStars)||0),0),$=(d||[]).filter(e=>n(e.date)&&!e.deletedAt).reduce((e,s)=>e+(Number(s.stars)||0),0),z=Object.fromEntries((x||[]).map(e=>[e.id,e])),S=Object.fromEntries((b||[]).map(e=>[e.id,e])),h=new Map;for(const e of k){const s=z[e.taskId];if(!s)continue;const o=s.activityId;o&&(h.has(o)||h.set(o,new Set),h.get(o).add(e.completionDate))}const D=[...h.entries()].map(([e,s])=>{const o=S[e];return{name:(o==null?void 0:o.short)||(o==null?void 0:o.name)||"Activity",color:(o==null?void 0:o.color)||"#6366f1",days:s.size}}).sort((e,s)=>s.days-e.days),i=(u||[]).filter(e=>e.finished&&n(e.finished)),A=(y||[]).filter(e=>n(e.playedOn||e.played_on)),I=(l||[]).filter(e=>{const s=(e.startedAt||e.createdAt||"").slice(0,10);return s&&s>=g}),O=Math.round(I.reduce((e,s)=>e+(Number(s.durationSeconds)||0),0)/60);let W=null,T=0;for(const[e,s]of Object.entries(m||{})){const o=Number(s==null?void 0:s.current)||0;o>T&&(T=o,W=((F=S[e])==null?void 0:F.name)||e)}const N=[];for(const e of p||[])(Number.isInteger(e.recurWeekday)||e.date&&e.date>t&&e.date<=new Date(c.getTime()+7*864e5).toISOString().slice(0,10))&&N.push(e);const M=N.slice(0,3);return{weekStart:g,today:t,kidName:(a==null?void 0:a.name)||"your kid",starsEarned:v,giftedStars:$,starsTotal:v+$,activityRows:D,booksFinished:i,songPlaysThisWeek:A,sessionsThisWeek:I,practiceMinutes:O,longestStreakName:W,longestStreakDays:T,upcoming:M}}function r(a){return String(a||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function P(a,{appUrl:f=""}={}){const{kidName:x,starsEarned:b,giftedStars:m,starsTotal:u,activityRows:y,booksFinished:d,songPlaysThisWeek:l,sessionsThisWeek:p,practiceMinutes:c,longestStreakName:g,longestStreakDays:t,upcoming:n,weekStart:k,today:v}=a,w=i=>i?new Date(i+"T12:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}):"",$=r(x),z=r(f||"https://little-legend-treasures.netlify.app"),S=y.length===0?'<p style="color:#94a3b8;font-size:13px;margin:8px 0;">No approved activities this week yet.</p>':`<table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0;">
        ${y.map(i=>`
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#1e293b;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${r(i.color)};margin-right:8px;vertical-align:middle;"></span>
              ${r(i.name)}
            </td>
            <td style="padding:6px 0;font-size:14px;color:#64748b;text-align:right;font-variant-numeric:tabular-nums;">
              ${i.days} day${i.days===1?"":"s"}
            </td>
          </tr>
        `).join("")}
      </table>`,h=d.length===0?"":`
    <p style="font-size:13px;color:#475569;margin:8px 0 0;">
      📚 Finished ${d.length} book${d.length===1?"":"s"}:
      ${d.map(i=>`<em>${r(i.canonicalTitle||i.title||"")}</em>`).join(", ")}
    </p>`,D=n.length===0?"":`
    <h3 style="font-size:13px;color:#334155;margin:24px 0 8px;text-transform:uppercase;letter-spacing:0.06em;">Coming up</h3>
    <ul style="margin:0;padding:0 0 0 18px;font-size:14px;color:#1e293b;line-height:1.6;">
      ${n.map(i=>`<li>${r(i.title)}${i.date?` <span style="color:#94a3b8;">· ${r(w(i.date))}</span>`:""}${Number.isInteger(i.recurWeekday)?' <span style="color:#94a3b8;">· weekly</span>':""}</li>`).join("")}
    </ul>`;return`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Friday recap · ${$}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1e293b;">
  <table role="presentation" style="width:100%;background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td>
        <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:24px 24px 8px;">
              <div style="font-size:11px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">Family Command Center · Friday recap</div>
              <h1 style="margin:8px 0 0;font-size:22px;color:#0f172a;">${$}'s week</h1>
              <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${r(w(k))} – ${r(w(v))}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px;">
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="background:#fef3c7;border-radius:12px;padding:14px;width:33%;vertical-align:top;">
                    <div style="font-size:11px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Stars earned</div>
                    <div style="font-size:28px;font-weight:800;color:#b45309;margin-top:4px;">${u}</div>
                    ${m>0?`<div style="font-size:11px;color:#a16207;margin-top:2px;">incl. ${m}⭐ bonus</div>`:""}
                  </td>
                  <td style="width:8px;"></td>
                  <td style="background:#d1fae5;border-radius:12px;padding:14px;width:33%;vertical-align:top;">
                    <div style="font-size:11px;color:#065f46;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Practice</div>
                    <div style="font-size:28px;font-weight:800;color:#047857;margin-top:4px;">${c}m</div>
                    <div style="font-size:11px;color:#059669;margin-top:2px;">${p.length} session${p.length===1?"":"s"}</div>
                  </td>
                  <td style="width:8px;"></td>
                  <td style="background:#ede9fe;border-radius:12px;padding:14px;width:33%;vertical-align:top;">
                    <div style="font-size:11px;color:#5b21b6;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Longest streak</div>
                    <div style="font-size:28px;font-weight:800;color:#6d28d9;margin-top:4px;">${t}</div>
                    <div style="font-size:11px;color:#7c3aed;margin-top:2px;">${r(g||"—")}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 16px;">
              <h3 style="font-size:13px;color:#334155;margin:8px 0;text-transform:uppercase;letter-spacing:0.06em;">Activity days</h3>
              ${S}
              ${h}
              ${l.length>0?`<p style="font-size:13px;color:#475569;margin:8px 0 0;">🥁 ${l.length} song play${l.length===1?"":"s"} logged.</p>`:""}
              ${D}
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid #e2e8f0;">
              <a href="${z}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;">
                Open the app →
              </a>
              <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">
                Family Command Center sent this digest because someone opted you in under More → Email Setup. Reply STOP to be removed.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`}function H(a){const{kidName:f,starsTotal:x,activityRows:b,practiceMinutes:m,sessionsThisWeek:u,longestStreakName:y,longestStreakDays:d,booksFinished:l,upcoming:p,weekStart:c,today:g}=a,t=[];if(t.push("Family Command Center — Friday recap"),t.push(`${f}'s week (${c} → ${g})`),t.push(""),t.push(`Stars earned this week: ${x}`),t.push(`Practice: ${m} min across ${u.length} session${u.length===1?"":"s"}`),d>0&&t.push(`Longest streak: ${d} days · ${y}`),t.push(""),b.length>0){t.push("Activity days:");for(const n of b)t.push(`  • ${n.name}: ${n.days} day${n.days===1?"":"s"}`);t.push("")}if(l.length>0&&(t.push(`Books finished: ${l.map(n=>n.canonicalTitle||n.title).join(", ")}`),t.push("")),p.length>0){t.push("Coming up:");for(const n of p)t.push(`  • ${n.title}${n.date?` (${n.date})`:""}`)}return t.join(`
`)}export{E as buildDigestData,P as renderDigestHtml,H as renderDigestText};

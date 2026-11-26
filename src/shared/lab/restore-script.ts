// src/shared/lab/restore-script.ts
import { LAB_ATTRIBUTE, LAB_COOKIE, LAB_STYLE_ID } from '../constants'

/**
 * The inline script that puts a visitor's colors back before the page is
 * painted. The CSS comes from `localStorage`, where this site wrote it, and is
 * used only while the cookie still holds the same choices and the build is the
 * one that produced it; otherwise the client plugin builds it again.
 */
export function labRestoreScript(version: string): string {
  return `(function(){try{`
    + `var m=document.cookie.match(/(?:^|; )${LAB_COOKIE}=([^;]*)/);if(!m)return;`
    + `var c=JSON.parse(localStorage.getItem('${LAB_COOKIE}'));`
    + `if(!c||c.v!=='${version}'||c.key!==decodeURIComponent(m[1]))return;`
    + `var s=document.createElement('style');s.id='${LAB_STYLE_ID}';s.textContent=c.css;document.head.appendChild(s);`
    + `document.documentElement.setAttribute('${LAB_ATTRIBUTE}',c.ids)`
    + `}catch(e){}})()`
}

/**
@licence
    Copyright (c) 2023 Alan Chandler, all rights reserved

    This file is part of Dragmove.

    Dragmove is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Dragmove is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Dragmove.  If not, see <http://www.gnu.org/licenses/>.
*/
import { LitElement, html,css } from '../libs/lit-element.js';
import { repeat } from '../libs/repeat.js';
import { classMap } from '../libs/class-map.js';

import { api } from '../modules/api.js';
import {employeeFilter} from '../modules/employee.js';

import tooltip from '../styles/tooltip.js';
import scrollbar from '../styles/scrollbar.js';
import button from '../styles/button.js';
import PasRecordNavigator from '../mixins/pas-record-navigator.js';

import './pas-contacts-staff-details.js';
import './pas-permission-icons.js';
import './pas-readonly.js';

import Debug from '../libs/debug.js';

const debug = Debug('contactstaff');

class PasContactsStaff extends  PasRecordNavigator(LitElement) {
  static styles = [scrollbar,tooltip, button, css`
      :host {
        display: grid;
        margin: 5px 10px;
        grid-gap: 5px;
        grid-template-columns: 1fr 300px 358px;
        grid-template-areas: 
          ". ro right"
          "left left right";
      }

      .leftpanel {
        grid-area: left;
      }
      .readonly {
        grid-area: ro;
        border-radius: 10px;
        box-shadow: var(--pas-box-shadow);
        background: white;
        padding: 1em;
        place-items: center;
        max-height: 150px;
      }
      .rightpanel {
        grid-area: right;
      }

      #container {
        max-height: calc(100vh - 157px);
        overflow-x: hidden;
        overflow-y: auto;
      }


      .draggable {
        cursor: move;
      }
      .draggable.dragging {
        opacity: 0.5;
      }
      .staff {
        --pas-icon-size: 24px;
        display: grid;
        font-size: 8pt;
        grid-gap: 2px;
        grid-template-columns: 100px 100px 74px 24px 24px;
        grid-template-areas: 
          "fn ln occ occ lg"
          "per per per pin valid" ;
        border-radius: var(--pas-border-radius);
        border: 1px solid lightgrey;
        padding: 0.5em;
        margin: 5px 0;
      }
      .staff.selected {
        box-shadow: 0px 0px 20px 0px rgba(0,0,255,1);
        border-color: black;
      }
      .dummyicon {
        width: var(--pas-icon-size);
        height: var(--pas-icon-size);
      }

      .fn {
        grid-area: fn;

      }
      .ln {
        grid-area: ln;
      }
      .fn, .ln {
        font-weight: bold;
        color: var(--pas-staff-name);
      }
      .oc {
        grid-area: occ;
        font-weight: bold;
      }
      .oc.optom {
        color: var(--pas-optom-color);
      }
      .oc.medical {
        color: var(--pas-medical-color);
      }
      .oc.surgeon {
        color: 
      }
      .lgin {
        grid-area: lg;
      }
      .perm {
        grid-area: per;
      }
      .pin {
        grid-area: pin;
      }
      .vl {
        grid-area: valid;
      }

  `];
  constructor() {
    super('staffid', 'staff');
  }
  connectedCallback() {
    super.connectedCallback();
    this.pid = -1
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.pid = 0;
  }
  render() {
    return html`
      <pas-contacts-staff-details .staffid=${this.staffid} class="leftpanel"></pas-contacts-staff-details>
      <div class="readonly">
        ${this.readonly ? html`
          <pas-readonly></pas-readonly>
        `:''}
      </div>
      <div class="rightpanel">
            <header class="staff">
              <div class="fn">First</div>
              <div class="ln">Last</div>
              <div class="oc">Occupation</div>
              <div class="lgin left" data-tooltip="Has a Login"><pas-icon>key</pas-icon></div>
              <pas-permission-icons class="perm" keys="M:E:F:N:L:C:P:D"></pas-permission-icons>
              <div class="pin left" data-tooltip="Has two factor setup"><pas-icon>pin</pas-icon></div>
              <div class="vl left" data-tooltip="valid user?"><pas-icon>check_circle</pas-icon></div>
            </header>
            <section id="container">
              ${['admin', 'office', 'optom', 'consultant', 'tech'].map(occupation => html`
                <div class="occuption" @dragover=${this._dragOver} data-occupation="T${occupation}">
                  ${repeat(
                      this.records.filter(staff => employeeFilter(occupation,staff)),
                      (staff) => staff.staffid,
                      (staff) => html`
                    <div 
                      class="draggable staff ${classMap({selected: staff.staffid === this.staffid})}" 
                      @click=${this._staffSelected} 
                      data-staffid="${staff.staffid}" 
                      draggable="true"
                      @dragstart=${this._startDragging}
                      @dragend=${this._endDragging}>  
                      <div class="fn">${staff.firstname}</div>
                      <div class="ln">${staff.lastname}</div>
                      <div class="oc ${classMap({[staff.occupation]: true})}" >${staff.occupation}</div>
                      <pas-icon class="lgin ${classMap({passless: !staff.haspassword})}">${staff.haspassword? 'key': 'key_off'}</pas-icon>
                      <pas-permission-icons class="perm" .keys=${staff.accesskey}></pas-permission-icons>
                      ${staff.has2factor ? html`
                        <pas-icon class="pin">pin</pas-icon>
                      `:html`
                        <div class="dummyicon"></div>
                      `}
                      <pas-icon class="vl">${staff.valid? 'check_circle':'unpublished'}</pas-icon>
                    </div>
                  `)}              
              
                </div>
              `)}  
              ${['admin', 'office', 'optom', 'consultant', 'tech'].map(occupation => html`
                <div class="occuption" @dragover=${this._dragOver} data-occupation="F${occupation}">
                  ${repeat(
                    this.records.filter(staff => !staff.valid).filter(staff => employeeFilter(occupation,staff, true)),
                    (staff) => staff.staffid,
                    (staff) => html`
                    <div 
                      class="draggable staff ${classMap({selected: staff.staffid === this.staffid})}" 
                      @click=${this._staffSelected} 
                      data-staffid="${staff.staffid}" 
                      draggable="true"
                      @dragstart=${this._startDragging}
                      @dragend=${this._endDragging}>  
                      <div class="fn">${staff.firstname}</div>
                      <div class="ln">${staff.lastname}</div>
                      <div class="oc ${classMap({[staff.occupation]: true})}" >${staff.occupation}</div>
                      <pas-icon class="lgin ${classMap({passless: !staff.haspassword})}">${staff.haspassword? 'key': 'key_off'}</pas-icon>
                      <pas-permission-icons class="perm" .keys=${staff.accesskey}></pas-permission-icons>
                      ${staff.has2factor ? html`
                        <pas-icon class="pin">pin</pas-icon>
                      `:html`
                        <div class="dummyicon"></div>
                      `}
                      <pas-icon class="vl">${staff.valid? 'check_circle':'unpublished'}</pas-icon>
                    </div>
                  `)}              
              
                </div>
              `)}            
            </section>
          </div>      

    `;
  }
  _dragOver(e) {
    e.stopPropagation();
    if (this.container !== e.currentTarget) return;
    const targets = [...this.container.querySelectorAll('.draggable:not(.dragging)')];
    if (targets.length > 0) {
      //not in a section with only on element
      e.preventDefault();
      const y = e.clientY;
      const draggable = this.container.querySelector('.dragging');
      const target = targets.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return {offset: offset, element: child}
        } 
        return closest;
      },{offset: Number.NEGATIVE_INFINITY, element: null}).element
      if (target == null) {
       this.container.appendChild(draggable)
      } else {
        this.container.insertBefore(draggable, target);
      }
    }
  }
  async _endDragging(e) {
    e.stopPropagation();
    e.currentTarget.classList.remove('dragging');
    const section = e.currentTarget.parentNode;
    const targets = this.container.querySelectorAll('.draggable');
    let minPriority = 9999;
    let maxPriority = 0;
    for (const target of targets) {
      const staffid = Number(target.dataset.staffid);
      const record = this.records.find( staff => staff.staffid === staffid);
      if (typeof record !== 'undefined') {
        minPriority = Math.min(minPriority, record.priority);
        maxPriority = Math.max(maxPriority, record.priority);
      }
    }
    maxPriority = Math.max(maxPriority, minPriority + targets.length)
    const priorityStep = Math.floor((maxPriority - minPriority)/ targets.length);
    let priority = minPriority
    let didupdate = false;
    for (const target of targets) {
      const staffid = Number(target.dataset.staffid);
      const record = this.records.find( staff => staff.staffid === staffid);
      if (typeof record !== 'undefined' && record.priority !== priority) {
        await api('staff_priority', {staffid: staffid, priority: priority}); 
        record.priority = priority;
        didupdate = true;
;     }
      priority += priorityStep
    }
    if (didupdate) {
      const ordering = {
        admin: 1,
        office: 2, 
        optom: 3,
        medical: 4,
        surgeon: 4,
        misc: 4,
        tech: 5
      }
      const records = [...this.records.sort((a,b) => {
        if (a.valid && !b.valid) return -1;
        if (!a.valid && b.valid) return +1;
        const aorder = ordering[a.occupation.toLowerCase()];
        const border = ordering[b.occupation.toLowerCase()];
        if (aorder !== border) return aorder - border;
        if (aorder === 'admin') console.log('sorting by priorities a name', a.firstname, 'a.priority', a.priority, 'b name', b.firstname, 'b priority', b.priority);
        return a.priority - b.priority;
      })]
      this.records = records;
    }
  }
  _startDragging(e) {
    e.stopPropagation();
    e.currentTarget.classList.add('dragging')
    this.container = e.currentTarget.parentNode;
  }
}
customElements.define('pas-contacts-staff', PasContactsStaff);

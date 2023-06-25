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

/*
  This element is a mixin to perform the grunt work of record navigation over a number of records
*/


import { dedupeMixin } from './dedupe.js';
import { api } from '../modules/api.js';
import Route from '../libs/route.js';
import { read, save } from '../modules/record.js';
import Debug from '../libs/debug.js';


const debug = Debug('recnav');
const lockBug = Debug('locking');

const PasRecordNavigator = dedupeMixin( superclass =>
  class PasRecordNavigator extends superclass {

    static properties = {
        records: {type: Array},
        patient: {type: Object},
        pid: {type: Number},
        route: {type: Object},
        readonly: {type: Boolean},
        owner: {type: Object}
    };

    constructor(idname, recordname) {
      super();
      this.idname = idname;
      this.recordname = recordname;
      this.route = { active: false, params: {rid: ''}, query: {} };
      this.router = new Route(`/:rid`, `page:${this.recordname}`);
      this[this.idname] = 0;
      this.pid = 0;

      this.records = [];
      this.patient = { pid: 0, clinic: '' };
      this.pidInProgress = 0;
      this.summaryRequested = false;
      this.readonly = false;
      this.owner = {name: '', ip: ''};
      this._createRecord = this._createRecord.bind(this);
      this._recordChanged = this._recordChanged.bind(this);
      this._recordCreated = this._recordCreated.bind(this);
      this._recordDelete = this._recordDelete.bind(this);
      this._roChanged = this._roChanged.bind(this);
    }
    connectedCallback() {
      super.connectedCallback();

      this.removeAttribute('unresolved');
      this.addEventListener('create-record', this._createRecord);
      this.addEventListener('record-changed', this._recordChanged);
      this.addEventListener('record-created', this._recordCreated);
      this.addEventListener('record-delete', this._recordDelete);
      this.addEventListener('ro-changed', this._roChanged);
    }
    disconnectedCallback() {
      super.disconnectedCallback();
      this[this.idname] = 0;
      this.pid = 0;
      this.summaryRequested = false;
      this.records = [];
      this.removeEventListener('create-record', this._createRecord);
      this.removeEventListener('record-changed', this._recordChanged)
      this.removeEventListener('record-created', this._recordCreated);
      this.removeEventListener('record-delete', this._recordDelete);
      this.removeEventListener('ro-changed', this._roChanged);
    }


    update(changed) { 
      if (changed.has('pid') && this.pid !== 0) {
        this.records = [];
        this.summaryRequested = false;
        this[this.idname] = 0;
        this.pidInProgress = 0;
        this.summaryRequested = false;
        if (this.pid > 0) {
          //only read patient if pid is relevant 
          debug('reading patient', this.pid)
          read('patient', this.pid).then(patient => {
            this.patient = patient;
            debug('read patient', this.pid, 'immediately save so its not waiting for us when a new pid is chosen')
            save('patient', patient);
          });
        }
      }
      if (changed.has(this.idname)) {
        this.dispatchEvent(new CustomEvent(`${this.idname}-changed`, { bubbles: true, composed: true, detail: this[this.idname] }));
        if (this[this.idname] > 0) {
          const index = this.records.findIndex(r => r[this.idname] === this[this.idname]);
          if (index >= 0) {
            debug('routing after change to id to', this[this.idname]);
            this.router.params = {rid: this[this.idname]};
          }
        }
      }
      super.update(changed);
    }
    updated(changed) {
      if (changed.has('route')) {       
        if (this.route.active) {
          const subRoute = this.router.routeChange(this.route);
          if (subRoute.active) {
            if(!this.summaryRequested) {
              this._getSummary();
            }
            if (Number.isInteger(subRoute.params.rid)) {
              this[this.idname] = subRoute.params.rid;
            } else {
              this[this.idname] = 0; //set like this if we close down the tab              
            }
          } else {
            this[this.idname] = 0; //set like this if we close down the tab
          }
        } else {
          this[this.idname] = 0; //set like this if we close down the tab
        }
      }
      super.updated(changed);
    } 
    createSummaryRecord(record) {
      return {...record}; //abstract - expect to be overridden
    }
    newRecords() {
      //abstract - do be overridden if something to be done on new record
    }

    reSort() {
      //abstract - override to sort records by something
    }

    _createRecord(e) {
      e.stopPropagation();
      this.router.params = {rid: -1};
    }
    _getSummary() {
      debug('about to read record summary');
      if (this.pidInProgress !== this.pid) {
        this.pidInProgress = this.pid;
        api(`${this.recordname}_summary`, { pid: this.pid }).then(response => {
          if (response.status !== 'OK') throw new Error(response.status);
          this.pidInProgress = 0;
          this.summaryRequested = true;
          this.records = response.records;
          debug('call newRecords to process them');
          this.newRecords(this.records);
          if (this.records.length > 0) {
            this.reSort();
            if (this[this.idname] === 0) {
              //set up the record from the first one read AFTER sorting
              this[this.idname] = this.records[0][this.idname];
              debug('setting rid to first of received records rid:', this[this.idname]);
            }
          } else {
            this[this.idname] = 0;
          }
        });
      }
    }

    _recordChanged(e) {
      e.stopPropagation();
      if (this[this.idname] === e.detail[this.idname]) {
        //this wasn't just a reset of a record on the way out
        const index = this.records.findIndex(r => r[this.idname] === this[this.idname])
        if (index >= 0) {
          this.records[index] = this.createSummaryRecord(e.detail);
          this.newRecords(this.records);
          this.reSort();
          this.records = [...this.records]
        }
      }
    }
    _recordCreated(e) {
      e.stopPropagation()
      this.records.unshift(this.createSummaryRecord(e.detail));
      this[this.idname] = this.records[0][this.idname];
      this.newRecords(this.records);
      this.reSort();
    }
    _recordDelete(e) {
      e.stopPropagation();
      this.records = this.records.filter(r => r[this.idname] !== this[this.idname]);  //lose the record
      this.reSort();
      this.newRecords(this.records);  //to recalc totals
      if (this.records.length > 0) {
        this.router.params = { rid: this.records[0][this.idname] }
      } else {
        this.router.params = { rid: '' };
      }
    }
    _roChanged(e) {
      e.stopPropagation()
      lockBug('record navigator ro changed', JSON.stringify(e.detail) );
      this.readonly = e.detail.readonly;
      this.owner = e.detail.owner;
    }
  }

)
export default PasRecordNavigator;
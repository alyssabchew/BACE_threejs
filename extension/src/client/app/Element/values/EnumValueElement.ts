import { LitElement, html } from 'lit-element'
import { ConstantTypes } from '../../constants.js';
// import * as THREE from 'three';
// let constants: any[]; 
// extension/node_modules/three/src/constants.js
// import * as constants from '../../../../../node_modules/three/src/constants;
// interface constantTypes {
//   [key: string]: string[]
// }
import constants from 'three/src/constants';
import ChromeSelectStyle from '../shared-styles/chrome-select';

export default class EnumValueElement extends LitElement {
  uuid: string | undefined;
  type: string = '';
  value: number | null = null;

  constructor() {
    super();
    this.onInput = this.onInput.bind(this);
  }

  onInput(e: any) {
    const selected = [...e.target.querySelectorAll('option')].filter(o => o.selected)[0];
    const value = +selected.value;

    if (value !== null) {
      this.dispatchEvent(new CustomEvent('change', {
        detail: {
          value,
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  render() {
    if (!ConstantTypes[this.type]) {
      return html`<input type="number" value="${this.value}" />`;
    }

    const options = ConstantTypes[this.type].map((c, i) => {
      let value: any;
      value = constants[c];

      // let 'null' be a special enum (-1)
      if (c === 'null') value = -1;

      if (typeof value !== 'number') throw new Error (`invalid constant value for ${c}`);

      const selected = this.value === undefined ? i === 0 : this.value === value;
      return html`<option value="${value}" .selected="${selected}">${c}</option>`;
    })

    return html`
      <style>
        :host {
          display: flex;
        }
      ${ChromeSelectStyle}
      </style>
      <select class="chrome-select" @input="${this.onInput}">${options}</select>
    `;
  }
}
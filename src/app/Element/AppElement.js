import { LitElement, html } from lit-element;
import ContentBridge from '../ContentBridge.js';

const ERROR_TIMEOUT = 5000;

const panels = {
  scene: {
    title: 'Scene',
    resource: 'scenes',
  },
  geometries: {
    title: 'Geometries',
    resource: 'geometries',
  },
  materials: {
    title: 'Materials',
    resource: 'materials',
  },
  textures: {
    title: 'Textures',
    resource: 'textures',
  },
  rendering: {
    title: 'Rendering',
  },
};

export default class AppElement extends LitElement {
  static get properties() {
    return {
      errorText: { type: String, },
      needsReload: { type: Boolean, },
      isReady: { type: Boolean },
      // scene, geometries, materials, textures, rendering
      panel: { type: String, },
      activeScene: { type: String, },
      activeEntity: { type: String, },
      activeRenderer: { type: String, },
    }
  }

  constructor() {
    super();

    this.needsReload = true;
    this.isReady = false;
    this.panel = 'scene'

    this.onContentLoad = this.onContentLoad.bind(this);
    this.onContentError = this.onContentError.bind(this);
    this.onPanelClick = this.onPanelClick.bind(this);
    this.onContentUpdate = this.onContentUpdate.bind(this);
    // this.onCommand = this.onCommand.bind(this);

    this.content = new ContentBridge();

    this.content.addEventListener('load', this.onContentLoad);
    this.content.addEventListener('error', this.onContentError);

    // need to add event listeners for onContentUpdate, and onCommand
    // in the three dev tool source code, there are 6 onContentUpdate event listeners?
    // this.content.addEventListener('')

  }

  setError(error) {
    if (this.errorTimeout) {
      window.clearTimeout(this.errorTimeout)
    }
    this.errorText = error;
    this.errorTimeout = window.setTimeout(() => {
      this.errorText = '';
      this.errorTimeout = null;
    }, ERROR_TIMEOUT);
  }
  
  // fired when content is initially loaded
  onContentLoad(e){
    this.activeScene = undefined;
    this.activeEntity = undefined;
    this.activeRenderer = undefined;
    this.isReady = false;
    this.needsReload = false;
  }

  // error
  onContentError(e){
    this.setError(e.detail);
  }

  onPanelClick(e){
    this.panel = e.target.getAttribute('panel');
  }

  onContentUpdate(e){
    switch(e.type){
      case 'observe':
        this.isReady = true;
        const renderer = e.detail.uuids.find(id => /renderer/.test(id));
        if(!this.activeRenderer && renderer){
          this.activeRenderer = renderer;
        }
        this.refreshData({ activeEntity: false });
        break;
      case 'rendering-info-update':
        if(this.panel === 'rendering' && this.activeRenderer === e.detail.uuid){
          this.requestUpdate();
        }
        break;
      case 'entity-update':
        this.requestUpdate();
        break;
      case 'renderer-update':
        if(this.panel === 'rendering' && this.activeRenderer === e.detail.uuid){
          this.requestUpdate();
        }
        break;
      case 'scene-graph-update':
        if(this.panel === 'scene' && this.activeScene === e.detail.uuid){
          this.requestUpdate();
        }
        break;
      case 'overview-update':
        if(!this.activeScene && e.detail.type === 'scenes' && e.detail.entities[0]){
          this.activeScene = e.detail.entities[0].uuid;
        }
        else if(this.panel && panels[this.panel].resource === e.detail.type){
          this.requestUpdate();
        }
        break;
    }
  }

  render() {
    const panel = this.panel || 'scene';
    const panelDef = panels[panel];
    const errorText = this.errorText || '';

    // if panel is "scene" and there is an active scene, get the scene graph
    const graph = panel === 'scene' && this.activeScene ? this.content.getSceneGraph(this.activeScene) : void 0;

    // if the panel is "scene" and there is an active scene, get the resources overview (we might not want this here if we are doing the gui)
    const scenes = panel === 'scene' && this.activeScene ? this.content.getResourcesOverview('scenes') : void 0;

    // boolean whether to show the resourceView
    const showResourceView = !!(panelDef.resource && panel !== 'scene');

    // if show the resources, call getResourcesOverview (again we might not want this here if we have the GUI)
    const resources = showResourceView ? this.content.getResourcesOverview(panelDef.resource) : [];

    // check if the panel is rendering to decide whether to show the inspector
    const showInspector = panel === 'rendering' ? (!!this.activeRenderer) : (!!this.activeEntity);
    // define which entity is being inspected
    const inspectedEntity = panel === 'rendering' ? this.activeRenderer : this.activeEntity;
    // grab the data of the inspected entity
    const inspectedEntityData = showInspector ? this.content.getEntityAndDependencies(inspectedEntity) : void 0;
    // if the panel is rendering, get the info of an active renderer if there is one
    const renderingInfo = panel === 'rendering' && this.activeRenderer ? this.content.getRenderingInfo(this.activeRenderer) : void 0;
    
    return html`
    // add style tags
    <div class="flex" state=${this.isReady ? 'ready' : this.needsReload ? 'needs-reload' : 'waiting'} id="container">
      // reload panes
      <devtools-message visible-when='needs-reload'>
        <span>R3F Devtools requires a page reload.</span>
        <devtools-button @click="${() => this.content.reload()}"> // this calls content.reload() to just basically reload the page
          <span>Reload</span>
        </devtools-button>
      </devtools-message>

      <devtools-message visible-when='waiting'>
        <span>Waiting for a scene to be observed...</span>
        <span class="loading">▲</span> // leaves a symbol to show waiting for the scene to be observed
      </devtools-message>

      // application panes
      // selecting a panel
      <tab-bar class="flex inverse collapsible" visible-when='ready' @click=${this[$onPanelClick]}> 
        // titles of each panels component
        <x-icon class="collapsible" panel="scene" title="${panels.scene.title}" ?active=${panel === 'scene'} icon="cubes" fill></x-icon>
        <x-icon class="collapsible" panel="geometries" title="${panels.geometries.title}" ?active=${panel === 'geometries'} icon="dice-d20" fill></x-icon>
        <x-icon class="collapsible" panel="materials" title="${panels.materials.title}" ?active=${panel === 'materials'} icon="paint-brush" fill></x-icon>
        <x-icon class="collapsible" panel="textures" title="${panels.textures.title}" ?active=${panel === 'textures'} icon="chess-board" fill></x-icon>
        <x-icon class="collapsible" panel="rendering" title="${panels.rendering.title}" ?active=${panel === 'rendering'} icon="video" fill></x-icon>
      </tab-bar>
      <div class="frame flex" visible-when='ready'> 
        // scene viewer
        <scene-view
          .graph="${graph}"
          .scenes="${scenes}"
          .activeScene="${ifDefined(this.activeScene)}"
          .activeEntity="${ifDefined(this.activeEntity)}"
          ?enabled=${panel === 'scene'}
        ></scene-view>
        // resources viewer - NOTE: WE MIGHT NOT WANT THIS HERE IF WE HAVE A SEPARATE GUI
        <resources-view
          title="${panelDef.title}"
          selected="${ifDefined(this.activeEntity)}"
          .resources="${resources}"
          ?enabled=${showResourceView}
        ></resources-view>
        // renderer view
        <renderer-view
          .rendererId="${this.activeRenderer}"
          .renderingInfo="${renderingInfo}"
          ?enabled=${panel === 'rendering'}
        ></renderer-view>
      </div>

      // for inspecting a particular element
      <div ?show-inspector=${showInspector} class="inspector-frame frame flex inverse"
        visible-when='ready'>
          <parameters-view ?enabled=${showInspector}
            .uuid="${inspectedEntity}"
            .entities="${inspectedEntityData}">
          </parameters-view>
      </div>
      <title-bar title="${errorText}" class="error ${errorText ? 'show-error' : ''}"></title-bar>
    </div>
    `;
  }
}
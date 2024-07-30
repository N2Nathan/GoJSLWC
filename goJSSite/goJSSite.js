import { LightningElement, api, track } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import GoJSBundle from '@salesforce/resourceUrl/goJS'; // Reference the bundled static resource
import myStyles from '@salesforce/resourceUrl/GoJSStyles'; // Import the static resource
import jQuery from '@salesforce/resourceUrl/jQuery';
import jQueryUI from '@salesforce/resourceUrl/jQueryUI';
import updateJsData from '@salesforce/apex/updateJSON.updateJsData';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateRecord } from 'lightning/uiRecordApi';
import { EditorHelper } from './EditorHelper.js';
import { FloorplanPalette } from './FloorplanPalette.js';
import { Inspector } from './DataInspector.js';
import { Floorplan } from './Floorplan.js';
import { tweakInspectorForFloorplanner } from './DataInspectorOverrides.js';

//import FloorplanBundle from '@salesforce/resourceUrl/Floorplan'; // Reference the bundled static resource


export default class FloorPlanner extends LightningElement {
 //   @api recordId;
 //   @api componentConstructor;
    gojsInitialized = false;

    renderedCallback() {
        const textarea = this.template.querySelector('[data-id="mySavedModel"]');
        textarea.value = JSON.stringify({
            class: "GraphLinksModel",
            modelData: {
                units: "feet",
                unitsAbbreviation: "ft",
                unitsConversionFactor: 0.02,
                gridSize: 0.0833,
                wallThickness: 10,
                preferences: {
                    showWallGuidelines: true,
                    showWallLengths: true,
                    showWallAngles: true,
                    showOnlySmallWallAngles: true,
                    showGrid: true,
                    gridSnap: true
                }
            },
            nodeDataArray: [],
            linkDataArray: []
        }, null, 2);


        console.log('recordID ---> : ', this.recordId);
        if (this.gojsInitialized) {
            return;
        }

        Promise.all([
            loadScript(this, jQuery),
            loadScript(this, jQueryUI),
            loadStyle(this, myStyles),
            //loadScript(this, GoJSBundle), // Load GoJS bundle
        ])
            .then(() => {
               // console.log(go);
           //     window.go = go;
                console.log('Styles and scripts loaded successfully');
                this.initializeGoJS();
                this.gojsInitialized = true;
            })
            .catch(error => {
                console.error('Error loading styles or scripts', error);
            });
    }

    initializeGoJS() {
        try {
            console.log('OUTPUT 1: ', window.jQuery);
            if (!window.jQuery) {
                throw new Error('jQuery is not loaded');
            }
            const inspectordiv = this.template.querySelector('[data-id="ge-inspector"]');

            // Find diagram, palette, and overview divs by data-id attribute
            const diagramDivs = this.template.querySelectorAll('[data-id^="diagram"]');
            console.log(diagramDivs);
            const paletteDivs = this.template.querySelectorAll('[data-id^="palette"]');
            const overviewDivs = this.template.querySelectorAll('[data-id^="ge-overview-0"]');
    
            // Convert NodeList to Array
            const diagramDivsArray = Array.from(diagramDivs);
            const paletteDivsArray = Array.from(paletteDivs);
            const overviewDivsArray = Array.from(overviewDivs);

            // Call the init function with the found div elements
            this.init(window.jQuery, diagramDivsArray, paletteDivsArray, overviewDivsArray, inspectordiv);
    
            console.log('OUTPUT 2: ');
        } catch (error) {
            console.error('Error initializing GoJS: ', error);
        }
        
    }

    init(JQUERY, diagramDivs, paletteDivs, overviewDivs, inspectordiv) {
        const editorHelper = new EditorHelper(diagramDivs, paletteDivs, overviewDivs, Floorplan, inspectordiv, JQUERY);
        window.editorHelper = editorHelper;
    
        // replace generic palettes with FloorplanPalettes
        const myFloorplan = editorHelper.diagrams[0];
        editorHelper.palettes[0].div = null;
        editorHelper.palettes[1].div = null;
    
        const furniturePalette = new FloorplanPalette(paletteDivs[0], myFloorplan);
        furniturePalette.model = new window.go.GraphLinksModel(myFloorplan.makeDefaultFurniturePaletteNodeData());
        editorHelper.palettes[0] = furniturePalette;
    
        const wallPartsPalette = new FloorplanPalette(paletteDivs[1], myFloorplan);
        wallPartsPalette.model = new window.go.GraphLinksModel(myFloorplan.makeDefaultWallpartsPaletteNodeData());
        editorHelper.palettes[1] = wallPartsPalette;
    
        // listen if the model of the Floorplan changes completely -- if so, there has been a load event, and we must update walls / rooms
        myFloorplan.addDiagramListener('InitialLayoutCompleted', function (e) {
            // update units, grid size, units / px, showGrid, and preferences from the loading model's modelData
            const unitsForm = this.template.querySelector('#unitsForm');
            const gridSizeInput = this.template.querySelector('#gridSizeInput');
            const showGridCheckbox = this.template.querySelector('#showGridCheckbox');
            const gridSnapCheckbox = this.template.querySelector('#gridSnapCheckbox');
            const showWallGuidelinesCheckbox = this.template.querySelector('#wallGuidelinesCheckbox');
            const showWallLengthsCheckbox = this.template.querySelector('#showWallLengthsCheckbox');
            const showWallAnglesCheckbox = this.template.querySelector('#showWallAnglesCheckbox');
            const showOnlySmallWallAnglesCheckbox = this.template.querySelector('#onlySmallWallAnglesCheckbox');
            const unitsConversionFactorInput = this.template.querySelector('#unitsConversionFactorInput');
    
            const fp = e.diagram;
            const md = fp.model.modelData;
            const units = md.units;
            const unitsRadioChecked = document.getElementById(units);
            unitsRadioChecked.checked = true;
    
            let gridSize = md.gridSize;
            gridSize = fp.convertPixelsToUnits(gridSize);
            gridSizeInput.value = gridSize;
            fp.changeGridSize(gridSizeInput);
    
            const unitsConversionFactor = md.unitsConversionFactor;
            unitsConversionFactorInput.value = unitsConversionFactor;
            fp.changeUnitsConversionFactor(unitsConversionFactorInput, gridSizeInput);
            fp.changeUnits(unitsForm);
    
            const showGrid = md.preferences.showGrid;
            const gridSnap = md.preferences.gridSnap;
            const showWallGuidelines = md.preferences.showWallGuidelines;
            const showWallLengths = md.preferences.showWallLengths;
            const showWallAngles = md.preferences.showWallAngles;
            const showOnlySmallWallAngles = md.preferences.showOnlySmallWallAngles;
    
            showGridCheckbox.checked = showGrid;
            gridSnapCheckbox.checked = gridSnap;
            showWallGuidelinesCheckbox.checked = showWallGuidelines;
            showWallLengthsCheckbox.checked = showWallLengths;
            showWallAnglesCheckbox.checked = showWallAngles;
            showOnlySmallWallAnglesCheckbox.checked = showOnlySmallWallAngles;
    
            fp.checkboxChanged('showGridCheckbox');
            fp.checkboxChanged('gridSnapCheckbox');
            fp.checkboxChanged('wallGuidelinesCheckbox');
            fp.checkboxChanged('wallLengthsCheckbox');
            fp.checkboxChanged('wallAnglesCheckbox');
            fp.checkboxChanged('onlySmallWallAnglesCheckbox');
    
            // update walls and rooms geometries
            fp.nodes.iterator.each(function (n) {
                if (n.catewindow.gory === 'WallGroup') {
                    fp.updateWall(n);
                }
                if (n.catewindow.gory === 'RoomNode') {
                    fp.updateRoom(n);
                }
            });
        });
    
        /**
         * Update the tools buttons so the tool in use is highlighted
         */
        window.updateButtons = function (func, el) {
            func.call(myFloorplan);
            const toolButtons = this.template.querySelectorAll('.toolButtons');
            toolButtons.forEach(tb => {
                if (tb === el) {
                    tb.style.background = '#4B545F';
                    tb.style.color = 'white';
                } else {
                    tb.style.background = 'rgb(221, 221, 221)';
                    tb.style.color = 'black';
                }
            });
        };
    
        JQUERY(function () {
            JQUERY('#ge-palettes-container').accordion({
                heightStyle: 'content',
                activate: function () {
                    editorHelper.palettes.forEach(palette => palette.requestUpdate());
                },
            });
    
            const draggables = this.template.querySelectorAll('.ge-draggable');
            console.log(draggables);
            draggables.forEach(draggable => {
                const id = '#' + draggable.id;
                const hid = id + '-handle';
    
                JQUERY(id).draggable({
                    handle: hid,
                    stack: '.ge-draggable',
                    containment: 'parent',
                    scroll: false,
                    stop: function (event) {
                        this.style.height = 'unset';
                        const did = event.target.id;
                        // only unset width for inspector and options menu, whose widths are dependent on contents
                        if (did === 'ge-inspector-window' || did === 'optionsWindow') {
                            this.style.width = 'unset';
                        }
                    },
                });
            });
        }); // end jQuery
    
        // add options window hotkey (other hotkeys are defined in window.goeditor-setup.js)
        document.body.addEventListener('keydown', function (e) {
            const keynum = e.which;
            if (e.ctrlKey) {
                e.preventDefault();
                if (keynum === 66) {
                    editorHelper.geHideShowWindow('optionsWindow'); // ctrl + b
                }
            }
        });
    
        // function to tweak inspector for app-specific stuff is in floorplanner-datainspector-overrides.js
        tweakInspectorForFloorplanner(editorHelper.inspector, myFloorplan, editorHelper);
    
        const defaultModelTextarea = this.template.querySelector('[data-id="mySavedModel"]');
        console.log(defaultModelTextarea.value);
        const defaultModelString = defaultModelTextarea.value;
        const defaultModelJson = JSON.parse(defaultModelString);
        myFloorplan.model = window.go.Model.fromJson(defaultModelJson);
    
        window.myFloorplan = myFloorplan;
        window.furniturePalette = furniturePalette;
        window.wallPartsPalette = wallPartsPalette;
    }
    


    // Other methods remain unchanged

    showPalettesWindow() {
        this.geHideShowWindow('ge-palettes-window', true);
    }

    showOverviewsWindow() {
        this.geHideShowWindow('ge-overviews-window', true);
    }

    showInspectorWindow() {
        this.geHideShowWindow('ge-inspector-window', true);
    }

    showOptionsWindow() {
        this.geHideShowWindow('optionsWindow', true);
    }

    hidePalettesWindow() {
        this.geHideShowWindow('ge-palettes-window', false);
    }

    hideOverviewsWindow() {
        this.geHideShowWindow('ge-overviews-window', false);
    }

    hideInspectorWindow() {
        this.geHideShowWindow('ge-inspector-window', false);
    }

    hideOptionsWindow() {
        this.geHideShowWindow('optionsWindow', false);
    }

    enableWallBuilding() {
        window.updateButtons(this.myFloorplan.enableWallBuilding, this);
    }

    enableDividerBuilding() {
        updateButtons(myFloorplan.enableDividerBuilding, this);
    }

    disableWallBuilding() {
        updateButtons(myFloorplan.disableWallBuilding, this);
    }

    changeUnits(event) {
        myFloorplan.changeUnits(event.target);
    }

    changeGridSize(event) {
        myFloorplan.changeGridSize(event.target);
    }

    toggleGrid(event) {
        myFloorplan.checkboxChanged(event.target.id);
    }

    changeUnitsConversionFactor(event) {
        myFloorplan.changeUnitsConversionFactor(event.target, this.template.querySelector('#gridSizeInput'));
    }

    toggleGridSnap(event) {
        myFloorplan.checkboxChanged(event.target.id);
    }

    toggleWallGuidelines(event) {
        myFloorplan.checkboxChanged(event.target.id);
    }

    toggleWallLengths(event) {
        myFloorplan.checkboxChanged(event.target.id);
    }

    toggleWallAngles(event) {
        myFloorplan.checkboxChanged(event.target.id);
    }

    toggleOnlySmallWallAngles(event) {
        myFloorplan.checkboxChanged(event.target.id);
    }

    save() {
        const copyText = this.template.querySelector(".mySavedModel")?.value;
        console.log('OUTPUT : ', copyText);
        console.log('recordId --> : ', this.recordId);

        const fields = {};
        fields['Id'] = this.recordId;
        fields['GoJSONData__c'] = copyText;
        const recordInput = { fields };
        updateRecord(recordInput).then(() => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Record updated',
                    variant: 'success'
                })
            );
        }).catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Record not updated',
                    variant: 'error'
                })
            );
        });
    }

    load() {
        const modelJson = this.template.querySelector(".mySavedModel").value;
        myFloorplan.model = window.go.Model.fromJson(modelJson);
    }

    copyText() {
        const copyText = this.template.querySelector(".mySavedModel");
        copyText.select();
        document.execCommand("copy");
        alert("Text copied to clipboard!");
    }

    async paste() {
        try {
            const text = await navigator.clipboard.readText();
            this.template.querySelector(".mySavedModel").value = text;
            alert("Text pasted from clipboard!");
        } catch (err) {
            alert("Failed to paste text: " + err);
        }
    }

    geHideShowWindow(windowId, show) {
        const windowElement = this.template.querySelector(`#${windowId}`);
        if (show) {
            windowElement.style.visibility = 'visible';
        } else {
            windowElement.style.visibility = 'hidden';
        }
    }
}
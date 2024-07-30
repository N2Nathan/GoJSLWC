import { LightningElement, track, api } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import GoJSBundle from '@salesforce/resourceUrl/goJS'; // Reference the bundled static resource

export default class goJSWrapper extends LightningElement {
    @api componentConstructor;
    @api recordId;
    @track gojsLoaded = false;

    // Use connectedCallback() on the dynamic component
    // to signal when it's attached to the DOM
    async connectedCallback() {
        if (this.gojsLoaded) {
            return;
        }

        try {
            await loadScript(this, GoJSBundle);
            window.go = go;
            this.gojsLoaded = true;

            const { default: ctor } = await import("c/goJSSite");
            this.componentConstructor = ctor;
        } catch (error) {
            console.error('Error loading GoJS library or component', error);
        }
    }
}
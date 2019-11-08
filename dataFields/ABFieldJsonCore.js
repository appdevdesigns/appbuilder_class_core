/*
 * ABFieldJson
 *
 * An ABFieldJson defines a JSON field type.
 *
 */

var ABField = require("../../platform/dataFields/ABField");

function L(key, altText) {
	// TODO:
	return altText; // AD.lang.label.getLabel(key) || altText;
}

var ABFieldJsonDefaults = {
	key: 'json',	// unique key to reference this specific DataField
	icon: 'font',	// font-awesome icon reference.  (without the 'fa-').  so 'user'  to reference 'fa-user'

	// menuName: what gets displayed in the Editor drop list
	menuName: L('ab.dataField.json.menuName', '*JSON'),

	// description: what gets displayed in the Editor description.
	description: L('ab.dataField.json.description', '*JSON value')

};

var defaultValues = {
};

module.exports = class ABFieldBooleanCore extends ABField {
	constructor(values, object) {
		super(values, object, ABFieldJsonDefaults);

	}


	// return the default values for this DataField
	static defaults() {
		return ABFieldJsonDefaults;
	}

	static defaultValues() {
		return defaultValues;
	}

}
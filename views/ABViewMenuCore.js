const ABViewWidget = require("../../platform/views/ABViewWidget");

const ABViewMenuPropertyComponentDefaults = {
	orientation: 'x',
	buttonStyle: 'ab-menu-default',
	menuAlignment: 'ab-menu-left',
	menuInToolbar: 1,
	menuPadding: 10,
	menuTheme: "bg_gray",
	menuPosition: "left",
	menuTextLeft: "",
	menuTextRight: "",
	menuTextCenter: "",
	// [
	// 		{
	//			pageId: uuid,
	//			tabId: uuid, 
	//			type: string, // "page", "tab"
	//			isChecked: bool,
	//			aliasname: string,
	//			translations: []
	//		}
	// ]
	pages: []
}


const ABMenuDefaults = {
	key: 'menu',		// {string} unique key for this view
	icon: 'th-large',		// {string} fa-[icon] reference for this view
	labelKey: 'ab.components.menu' // {string} the multilingual label key for the class label
}

module.exports = class ABViewMenuCore extends ABViewWidget {

	/**
	 * @param {obj} values  key=>value hash of ABView values
	 * @param {ABApplication} application the application object this view is under
	 * @param {ABViewWidget} parent the ABViewWidget this view is a child of. (can be null)
	 */
	constructor(values, application, parent, defaultValues) {

		super(values, application, parent, defaultValues || ABMenuDefaults);

	}

	static common() {
		return ABMenuDefaults;
	}

	static defaultValues() {
		return ABViewMenuPropertyComponentDefaults;
	}


	///
	/// Instance Methods
	///

	/**
	 * @method toObj()
	 *
	 * properly compile the current state of this ABViewLabel instance
	 * into the values needed for saving.
	 *
	 * @return {json}
	 */
	toObj () {
		
		if (this.settings.pages) {
			this.settings.pages.forEach(page => {
				this.application.unTranslate(page, page, ["aliasname"]);
			});
		}
		
		var obj = super.toObj();
		obj.views = [];
		return obj;
	}


	/**
	 * @method fromValues()
	 *
	 * initialze this object with the given set of values.
	 * @param {obj} values
	 */
	fromValues (values) {

		super.fromValues(values);

		this.settings.pages = this.settings.pages || ABViewMenuPropertyComponentDefaults.pages;

		for (var i = 0; i < this.settings.pages.length; i++) {

			var page = this.settings.pages[i];
			if (page instanceof Object) {
				page.isChecked = JSON.parse(page.isChecked || false);

				this.application.translate(page, page, ["aliasname"]);
			}
			// Compatible with old data
			else if (typeof page == 'string') {
				this.settings.pages[i] = {
					pageId: page,
					isChecked: true
				};
			}
			
		}

		this.application.translate(this, this, ['menulabel']);

	}

	/**
	 * @method componentList
	 * return the list of components available on this view to display in the editor.
	 */
	componentList() {
		return [];
	}

	ClearPagesInView(menu) {
		// clear menu items
		if (menu && menu.count() > 1) {
			menu.find({}).forEach((item) => {
				menu.remove(item.id);
			});
		}
	}

	AddPagesToView(menu, pages) {

		if (!menu || !pages) return;

		(pages || []).forEach(displayPage => {

			if (displayPage.isChecked) {

				let existsPage = this.application.pages(p => p.id == displayPage.pageId, true)[0];
				if (!existsPage) return;

				let label = this.getAliasname(displayPage);

				menu.add({
					id: displayPage.tabId || displayPage.pageId,
					value: label,

					type: displayPage.type,
					pageId: displayPage.pageId
				});
			}

		});

	}

	/**
	 * @method getAliasname
	 * @param pageInfo - an object in settings
	 * { 
	 * 	pageId: uuid,
	 * 	tabId: uuid, 
	 * 	type: string, - "page" or "tab"
	 * 	isChecked: bool,
	 * 	aliasname: string,
	 *	translations: []
	 *}
	 * 
	 * @return {string}
	 */
	getAliasname(pageInfo) {

		var label =  pageInfo.aliasname;

		// if alias is empty, then find label of page or tab
		if (!label ||
			// remove [en] or [th] etc.
			!(label.replace(/\[.{2,}\]/g, ""))) {

			// find label of the actual page
			var page = this.application.pages(p => p.id == pageInfo.pageId, true)[0];
			if (page) {

				// find label of the tab view
				if (pageInfo.type == "tab") {
					var tabView = page.views(v => v.id == pageInfo.tabId, true)[0];
					if (tabView) {
						label = tabView.label;
					}
				}
				else {
					label = page.label;
				}

			}
		}

		return label;

	}

	copy(lookUpIds, parent) {

		let result = super.copy(lookUpIds, parent);

		// update ids of page's settings
		(result.settings.pages || []).forEach((p, i) => {

			let page = result.settings.pages[i];

			// Compatible with old data
			if (typeof page == 'string') {
				result.settings.pages[i] = lookUpIds[page];
			}
			else {
				page.pageId = lookUpIds[page.pageId];
				page.tabId = lookUpIds[page.tabId];
			}

		});

		return result;

	}



}
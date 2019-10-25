//
// ABObjectQuery
//
// A type of Object in our system that is based upon a complex relationship of multiple
// existing Objects.
//
// In the QueryBuilder section of App Builder, a new Query Object can be created.
// An initial Object can be chosen from our current list of Objects. After that, additional Objects
// and a specified join type can be specified.
//
// A list of fields from each specified Object can also be included as the data to be returned.
//
// A where statement is also part of the definition.
//

var ABObject = require("../platform/ABObject");
var ABModel = require("../platform/ABModel");

module.exports = class ABObjectQuery extends ABObject {
    constructor(attributes, application) {
        super(attributes, application);
        /*
{
	id: uuid(),
	name: 'name',
	labelFormat: 'xxxxx',
	isImported: 1/0,
	urlPath:'string',
	importFromObject: 'string', // JSON Schema style reference:  '#[ABApplication.id]/objects/[ABObject.id]'
								// to get other object:  ABApplication.objectFromRef(obj.importFromObject);
	translations:[
		{}
	],



	// ABOBjectQuery Specific Changes
	// we store a list of fields by their urls:
	fields:[
		{
			alias: "",
			fieldURL:'#/url/to/field',
		}
	],


	// we store a list of joins:
	joins:{
		alias: "",							// the alias name of table - use in SQL command
		objectURL:"#/...",					// the base object of the join
		links: [
			{
				alias: "",							// the alias name of table - use in SQL command
				fieldID: "uuid",					// the connection field of the object we are joining with.
				type:[left, right, inner, outer]	// join type: these should match the names of the knex methods
						=> innerJoin, leftJoin, leftOuterJoin, rightJoin, rightOuterJoin, fullOuterJoin
				links: [
					...
				]
			}
		]

	},


	where: { QBWhere }
}
*/

        // import all our ABObjects
        this.importJoins(attributes.joins || {});
        this.importFields(attributes.fields || []); // import after joins are imported
        // this.where = attributes.where || {}; // .workspaceFilterConditions
    }

    ///
    /// Static Methods
    ///
    /// Available to the Class level object.  These methods are not dependent
    /// on the instance values of the Application.
    ///

    /**
     * contextKey()
     * returns a unique key that represents a query in
     * our networking job resolutions.
     * @return {string}
     */
    static contextKey() {
        return "query";
    }

    ///
    /// Instance Methods
    ///

    /// ABApplication data methods

    /**
     * @method toObj()
     *
     * properly compile the current state of this ABObjectQuery instance
     * into the values needed for saving to the DB.
     *
     * @return {json}
     */
    toObj() {
        var settings = super.toObj();

        /// include our additional objects and where settings:

        settings.joins = this.exportJoins(); //objects;
        // settings.where  = this.where; // .workspaceFilterConditions

        return settings;
    }

    ///
    /// Fields
    ///

    /**
     * @method importFields
     * instantiate a set of fields from the given attributes.
     * Our attributes are a set of field URLs That should already be created in their respective
     * ABObjects.
     * @param {array} fieldSettings The different field urls for each field
     *					{ }
     */
    importFields(fieldSettings) {
        var newFields = [];
        (fieldSettings || []).forEach((fieldInfo) => {
            if (fieldInfo == null) return;

            // fieldInfo: {alias: "BASE_OBJECT", objectID: "fe0f5a03-096e-49fd-9884-51e59e2b3955", fieldID: "bbb6f08d-a399-405f-a367-7c3b22ee22b0"}
            // var field = this.application.urlResolve(fieldInfo.fieldURL);
            var fieldObj = this.application.objectByID(fieldInfo.objectID);
            if (!fieldObj) return;

            var field = fieldObj.fields((f) => {
                return f.id == fieldInfo.fieldID;
            })[0];

            // should be a field of base/join objects
            if (
                field &&
                this.canFilterField(field) &&
                // check duplicate
                newFields.filter(
                    (f) =>
                        f.alias == fieldInfo.alias &&
                        f.field.urlPointer() == fieldInfo.fieldURL
                ).length < 1
            ) {
                let clonedField = _.clone(field, false);

                clonedField.alias = fieldInfo.alias;

                // NOTE: query v1
                let alias = "";
                if (Array.isArray(this.joins())) {
                    alias = field.object.name;
                } else {
                    alias = fieldInfo.alias;
                }

                // include object name {aliasName}.{columnName}
                // to use it in grid headers & hidden fields
                clonedField.columnName = "{aliasName}.{columnName}"
                    .replace("{aliasName}", alias)
                    .replace("{columnName}", clonedField.columnName);

                newFields.push({
                    alias: fieldInfo.alias,
                    field: clonedField
                });
            }
        });
        this._fields = newFields;
    }

    /**
     * @method exportFields
     * convert our array of fields into a settings object for saving to disk.
     * @return {array}
     */
    exportFields() {
        var currFields = [];
        this._fields.forEach((fieldInfo) => {
            currFields.push({
                alias: fieldInfo.alias,
                fieldURL: fieldInfo.field.urlPointer()
            });
        });
        return currFields;
    }

    /**
     * @method fields()
     *
     * return an array of all the ABFields for this ABObject.
     *
     * @return {array}
     */
    fields(filter) {
        filter =
            filter ||
            function() {
                return true;
            };

        return this._fields
            .map((f) => f.field)
            .filter((result) => filter(result));
    }

    ///
    /// Joins & Objects
    ///

    /**
     * @method joins()
     *
     * return an object of joins for this Query.
     *
     * @return {Object}
     */
    joins() {
        return this._joins || {};
    }

    /**
     * @method objects()
     *
     * return an array of all the ABObjects for this Query.
     *
     * @return {array}
     */
    objects(filter) {
        if (!this._objects) return [];

        filter =
            filter ||
            function() {
                return true;
            };

        // get all objects (values of a object)
        let objects = Object.keys(this._objects).map((key) => {
            return this._objects[key];
        });

        return (objects || []).filter(filter);
    }

    /**
     * @method objectAlias()
     *
     * return alias of of ABObjects.
     *
     * @return {string}
     */
    objectAlias(objectId) {
        let result = null;

        Object.keys(this._objects || {}).forEach((alias) => {
            let obj = this._objects[alias];
            if (obj.id == objectId && !result) {
                result = alias;
            }
        });

        return result;
    }

    /**
     * @method objectBase
     * return the origin object
     *
     * @return {ABObject}
     */
    objectBase() {
        if (!this._joins.objectID) return null;

        return this.application.objectByID(this._joins.objectID) || null;
    }

    /**
     * @method links()
     *
     * return an array of links for this Query.
     *
     * @return {array}
     */
    links(filter) {
        filter =
            filter ||
            function() {
                return true;
            };

        return (this._links || []).filter(filter);
    }

    /**
     * @method importJoins
     * instantiate a set of joins from the given attributes.
     * Our joins contain a set of ABObject URLs that should already be created in our Application.
     * @param {Object} settings The different field urls for each field
     *					{ }
     */
    importJoins(settings) {
        // copy join settings
        this._joins = _.cloneDeep(settings);

        var newObjects = {};
        var newLinks = [];

        function storeObject(object, alias) {
            if (!object) return;

            // var inThere = newObjects.filter(obj => obj.id == object.id && obj.alias == alias ).length > 0;
            // if (!inThere) {
            newObjects[alias] = object;
            // newObjects.push({
            // 	alias: alias,
            // 	object: object
            // });
            // }
        }

        function storeLinks(links) {
            (links || []).forEach((link) => {
                // var inThere = newLinks.filter(l => l.fieldID == link.fieldID).length > 0;
                // if (!inThere) {
                newLinks.push(link);
                // }
            });
        }

        function processJoin(baseObject, joins) {
            if (!baseObject) return;

            (joins || []).forEach((link) => {
                // Convert our saved settings:
                //	{
                //		alias: "",							// the alias name of table - use in SQL command
                //		objectURL:"#/...",					// the base object of the join
                //		links: [
                //			{
                //				alias: "",							// the alias name of table - use in SQL command
                //				fieldID: "uuid",					// uhe connection field of the object we are joining with.
                //				type:[left, right, inner, outer]	// join type: these should match the names of the knex methods
                //						=> innerJoin, leftJoin, leftOuterJoin, rightJoin, rightOuterJoin, fullOuterJoin
                //				links: [
                //					...
                //				]
                //			}
                //		]
                //	},

                var linkField = baseObject.fields((f) => {
                    return f.id == link.fieldID;
                })[0];
                if (!linkField) return;

                // track our linked object
                var linkObject = linkField.datasourceLink;
                if (!linkObject) return;

                storeObject(linkObject, link.alias);

                storeLinks(link.links);

                processJoin(linkObject, link.links);
            });
        }

        if (!this._joins.objectURL)
            // TODO: this is old query version
            return;

        // store the root object
        var rootObject = this.objectBase();
        if (!rootObject) {
            this._objects = newObjects;
            return;
        }

        storeObject(rootObject, "BASE_OBJECT");

        storeLinks(settings.links);

        processJoin(rootObject, settings.links);

        this._objects = newObjects;
        this._links = newLinks;
    }

    /**
     * @method exportObjects
     * save our list of objects into our format for persisting on the server
     * @param {array} settings
     */
    exportJoins() {
        return _.cloneDeep(this._joins || {});
    }

    ///
    /// Working with Client Components:
    ///

    /**
     * @method model
     * return a Model object that will allow you to interact with the data for
     * this ABObjectQuery.
     */
    model() {
        // NOTE: now that a DataCollection overwrites the context of it's
        // object's model, it is no longer a good idea to only have a single
        // instance of this._model per ABObject.  We should provide a new
        // instance each time.

        // if (!this._model) {

        this._model = new ABModel(this);

        // default the context of this model's operations to this object
        this._model.contextKey(ABObjectQuery.contextKey());
        this._model.contextValues({ id: this.id }); // the datacollection.id
        // }

        return this._model;
    }

    /**
     * @method canFilterObject
     * evaluate the provided object to see if it can directly be filtered by this
     * query.
     * @param {ABObject} object
     * @return {bool}
     */
    canFilterObject(object) {
        if (!object) return false;

        // I can filter this object if it is one of the objects in my joins
        return (
            this.objects((obj) => {
                return obj.id == object.id;
            }).length > 0
        );
    }

    /**
     * @method canFilterField
     * evaluate the provided field to see if it can be filtered by this
     * query.
     * @param {ABObject} object
     * @return {bool}
     */
    canFilterField(field) {
        if (!field) return false;

        // I can filter a field if it's object OR the object it links to can be filtered:
        var object = field.object;
        var linkedObject = field.datasourceLink;

        return (
            this.canFilterObject(object) || this.canFilterObject(linkedObject)
        );
    }

    /**
     * @method urlPointer()
     * return the url pointer that references this object. This url pointer
     * should be able to be used by this.application.urlResolve() to return
     * this object.
     *
     * @param {boolean} acrossApp - flag to include application id to url
     *
     * @return {string}
     */
    urlPointer(acrossApp) {
        return this.application.urlQuery(acrossApp) + this.id;
    }

    /**
     * @method isReadOnly
     *
     * @return {boolean}
     */
    get isReadOnly() {
        return true;
    }

    /**
     * @method isDisabled()
     * check this contains removed objects or fields
     *
     * @return {boolean}
     */
    isDisabled() {
        return this.disabled || false;
    }
};

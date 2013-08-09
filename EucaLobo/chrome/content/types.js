//
//  Author: Vlad Seryakov vseryakov@gmail.com
//  May 2012
//

// Base class for tree container
var TreeView = {
    name: '',
    model: '',
    tree: null,
    treeBox : null,
    treeList : new Array(),
    selection : null,
    visible: false,
    atomService: null,
    properties: [],
    refreshTimeout: 10000,
    refreshTimer: null,
    menuActive: false,
    searchElement: null,
    searchTimer: null,
    filterList: null,
    tagId: null,
    winDetails: null,
    tab: null,

    getName: function()
    {
        return this.name ? this.name : this.getModelName();
    },
    getModelName: function()
    {
        if (this.model instanceof Array) return this.model[0];
        return this.model;
    },
    getModel: function()
    {
        return this.model ? this.core.getModel(this.getModelName()) : null;
    },
    getData: function()
    {
        return this.treeList;
    },
    setData: function(list)
    {
        this.treeList = new Array();
        if (list) {
            this.treeList = this.treeList.concat(list);
        }
        this.treeBox.rowCountChanged(0, this.treeList.length);
        this.treeBox.invalidate();
        this.selection.clearSelection();
        this.invalidate();
    },
    getList: function()
    {
        var list = (this.model ? this.getModel() : this.getData()) || [];
        log(this.getName() + ' contains ' + list.length + ' records');
        return list || [];
    },
    get rowCount() {
        return this.treeList.length;
    },
    setTree : function(treeBox)
    {
        this.treeBox = treeBox;
    },
    isEmpty: function()
    {
        return this.rowCount == 0;
    },
    isRefreshable: function()
    {
        return false;
    },
    isVisible: function()
    {
        return this.visible;
    },
    isEditable : function(idx, column)
    {
        return true;
    },
    isContainer : function(idx)
    {
        return false;
    },
    isSeparator : function(idx)
    {
        return false;
    },
    isSorted : function()
    {
        return false;
    },
    getSelected : function()
    {
        return !this.selection || this.selection.currentIndex == -1 ? null : this.treeList[this.selection.currentIndex];
    },
    setSelected : function(index)
    {
        this.selection.select(index);
    },
    getSelectedAll: function()
    {
        var list = new Array();
        for (var i in this.treeList) {
            if (this.selection.isSelected(i)) {
                list.push(this.treeList[i]);
            }
        }
        return list;
    },
    getImageSrc : function(idx, column)
    {
        return "";
    },
    getProgressMode : function(idx, column)
    {
    },
    getParentIndex: function(idx)
    {
        return -1;
    },
    getCellText : function(idx, column)
    {
        var name = column.id.split(".").pop();
        return idx >= this.rowCount ? "" : this.core.modelValue(name, this.treeList[idx][name]);
    },
    getCellValue : function(idx, column)
    {
        var name = column.id.split(".").pop();
        return idx >= this.rowCount ? "" : this.treeList[idx][name];
    },
    setCellValue: function (idx, column, val)
    {
        var name = column.id.split(".").pop();
        if (idx >= 0 && idx < this.rowCount) this.treeList[idx][name] = val;
    },
    modelChanged : function(name) {
        log('model changed ' + this.getName());
        if (this.visible || this.core.getModel(name) == null) {
            this.invalidate();
        }
    },
    hasNextSibling: function(idx, after)
    {
        return false;
    },
    canDrop: function(idx, orientation, data)
    {
        return true;
    },
    drop: function(idx, orientation, data)
    {
    },
    cycleCell : function(idx, column)
    {
    },
    performAction : function(action)
    {
    },
    performActionOnCell : function(action, idx, column)
    {
    },
    getRowProperties : function(idx, column, prop)
    {
    },
    getCellProperties : function(idx, column, prop)
    {
        var name = column.id.split(".").pop();
        if (idx < 0 || idx >= this.rowCount || this.properties.indexOf(name) == -1) return;
        var value = String(this.treeList[idx][name]).replace(/[ -.:]+/g,'_').toLowerCase();
        // Use CSS entry if exists:  treechildren::-moz-tree-cell(name_value) {}
        prop.AppendElement(this.getAtom(this.getName() + "_" + value));
    },
    getColumnProperties : function(column, element, prop)
    {
    },
    getLevel : function(idx)
    {
        return 0;
    },
    getAtom: function(name)
    {
        if (!this.atomService) {
            this.atomService = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
        }
        return this.atomService.getAtom(name);
    },
    cycleHeader : function(col)
    {
        var item = this.getSelected();
        var csd = col.element.getAttribute("sortDirection");
        var sortDirection = (csd == "ascending" || csd == "natural") ? "descending" : "ascending";
        for ( var i = 0; i < col.columns.count; i++) {
            col.columns.getColumnAt(i).element.setAttribute("sortDirection", "natural");
        }
        col.element.setAttribute("sortDirection", sortDirection);
        this.sort();
        this.treeBox.invalidate();
        if (item) this.select(item);
    },
    sort : function()
    {
        var item = this.getSelected();
        this.treeBox.invalidate();
        var sortField = null;
        var ascending = null;
        for (var i = 0; i < this.tree.columns.count; i++) {
            var col = this.tree.columns.getColumnAt(i);
            var direction = col.element.getAttribute("sortDirection");
            if (direction && direction != "natural") {
                ascending = (direction == "ascending");
                sortField = col.id.split(".").pop();
                break;
            }
        }
        if (!sortField) return;
        this.core.sortObjects(this.treeList, sortField, ascending);
        if (item) this.select(item);
    },
    remove: function(obj, columns)
    {
        var i = this.find(obj, columns);
        if (i >= 0) {
            this.treeList.splice(i, 1);
            this.treeBox.rowCountChanged(i + 1, -1);
        }
    },
    replace: function(obj, columns)
    {
        var i = this.find(obj, columns);
        if (i >= 0) {
            this.treeList.splice(i, 1, obj);
            this.treeBox.rowCountChanged(i + 1, -1);
        }
    },
    find: function(obj, columns)
    {
        if (obj) {
            if (!columns) columns = ['id', 'name', 'title'];
            for (var i in this.treeList) {
                for (var c in columns) {
                    var n = columns[c];
                    if (obj[n] && obj[n] != "" && this.treeList[i][n] == obj[n]) return i;
                }
            }
        }
        return -1;
    },
    select : function(obj, columns)
    {
        var i = this.find(obj, columns);
        if (i >= 0) {
            var old = this.selection.currentIndex;
            this.selection.select(i);
            this.treeBox.ensureRowIsVisible(i);
            // Make sure the event is fired if we select same item
            if (old == i) {
                this.selectionChanged();
            }
            return true;
        }
        return false;
    },
    selectAll: function(list)
    {
        if (!list) return;
        this.selection.selectEventsSuppressed = true;
        this.selection.clearSelection();
        for (var i in list) {
            var idx = this.find(list[i]);
            if (idx >= 0) {
                this.selection.toggleSelect(idx);
                this.treeBox.ensureRowIsVisible(idx);
            }
        }
        this.selection.selectEventsSuppressed = false;
    },
    refresh : function(force)
    {
        var name = this.getModelName();
        if (name) {
            this.core.refreshModel(name);
            this.refreshAll(force);
        } else {
            this.invalidate();
        }
    },
    refreshAll: function(force)
    {
        log('refreshAll' + (force ? "force" : "") + ' ' + this.model);
        if (this.model instanceof Array) {
            var args = [];
            for (var i = 1; i < this.model.length; i++) {
                if (force || this.core.getModel(this.model[i]) == null) {
                    args.push(this.model[i]);
                }
            }
            if (args.length) {
                debug('refreshAll: ' + args);
                this.core.refreshModel.apply(this.core, args);
            }
        }
    },
    startRefreshTimer : function()
    {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        var me = this;
        // Ignore refresh timer if we have popup active
        this.refreshTimer = setTimeout(function() { if (!me.menuActive) me.onRefreshTimer(); }, this.refreshTimeout);
        log('start timer ' + this.getName() + ' for ' + this.refreshTimeout + ' ms');
    },
    stopRefreshTimer : function()
    {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
    },
    onRefreshTimer: function()
    {
        this.refresh();
    },
    invalidate : function()
    {
        this.display(this.filter(this.getList()));
    },
    filter : function(list)
    {
        if (this.searchElement) {
            list = filterList(list, $(this.searchElement).value);
        }

        // Must be list of lists, each item is object with name: value: properties
        if (this.filterList) {
            var nlist = new Array();
            for (var i in list) {
                for (var j in this.filterList) {
                    if (this.filterList[j].value) {
                        var p = String(list[i][this.filterList[j].name]);
                        var rc = p.match(this.filterList[j].value);
                        if ((this.filterList[j].not && !rc) || (!this.filterList[j].not && rc)) {
                            nlist.push(list[i]);
                        }
                    } else
                    if (this.filterList[j].hasOwnProperty('empty')) {
                        if ((this.filterList[j].empty && !list[i][this.filterList[j].name]) ||
                            (!this.filterList[j].empty && list[i][this.filterList[j].name])) {
                            nlist.push(list[i]);
                        }
                    }
                }
            }
            list = nlist;
        }
        return list;
    },
    menuChanged: function()
    {
        this.menuActive = true;
    },
    menuHidden: function()
    {
        this.menuActive = false;
    },
    menuSelected: function()
    {
        var popup = $("ew." + this.getName() + ".contextmenu");
        if (popup && this.treeList.length) {
            popup.openPopup(this.tree, "overlap", 48, 16, true, false);
        }
    },
    selectionChanged: function(event)
    {
    },
    filterChanged: function(event)
    {
        this.invalidate();
    },
    searchChanged: function(event)
    {
        if (!this.searchElement) return;
        this.core.setStrPrefs(this.searchElement, $(this.searchElement).value);

        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        var me = this;
        this.searchTimer = setTimeout(function() { me.onSearch(); }, 500);
    },
    onSearch: function() {
        this.invalidate();
    },
    display : function(list)
    {
        var sel = cloneObject(this.getSelected());
        this.treeBox.rowCountChanged(0, -this.treeList.length);
        this.treeList = new Array();
        if (list) {
            this.treeList = this.treeList.concat(list);
        }
        log(this.getName() + ' displays ' + this.treeList.length + ' records');
        this.treeBox.rowCountChanged(0, this.treeList.length);
        this.treeBox.invalidate();
        this.selection.clearSelection();
        // No need to sort or select if we are not visible but because we refer to the original model list,
        // multiple views may sort the same list at the same time
        if (this.isVisible()) {
            this.sort();
            if (this.isRefreshable()) {
                this.startRefreshTimer();
            } else {
                this.stopRefreshTimer();
            }
            if (!this.select(sel)) {
                this.selection.select(0);
            }
        }
    },
    activate: function()
    {
        this.visible = true;
        this.restorePreferences();
        // First time, refresh the model
        if (this.isEmpty() && this.model && this.getModel() == null) {
            this.refresh();
        }
    },
    deactivate: function()
    {
        this.visible = false;
        this.stopRefreshTimer();
        this.savePreferences();
    },
    tag: function(event, callback)
    {
        var item = this.getSelected();
        if (!item) return;
        var tag = this.core.promptForTag(item.tags);
        if (tag == null) return;
        // Replace tag in the object without reloading the whole list
        item.tags = this.core.parseTags(tag);
        this.core.processTags(item);
        this.core.setTags(item[this.tagId || "id"], item.tags, callback);
    },
    copyToClipboard : function(name)
    {
        var item = this.getSelected();
        if (item) {
            this.core.copyToClipboard(item[name]);
        }
    },
    clicked: function(event)
    {
        // Delay refresh if we are working with the list
        if (this.refreshTimer) {
            this.startRefreshTimer();
        }
        if (this.core.winDetails && event) {
            this.displayDetails(event);
        }
    },
    onKeydown: function(event)
    {
        debug(this.getName() + " " + event.keyCode + " " + event.shiftKey);
        switch (event.keyCode) {
        case 121: // F10
            // Intention here is for shift+F10 to bring up the context menu
            // by falling through to the next case, but it does not work.  It
            // does fall through and execute the menuSelected() call but the
            // context menu does not appear.
            if (!event.shiftKey) {
                break;
            }

        case 13: // enter
        case 93: // contextmenu
            this.menuSelected();
            event.stopPropagation();
            event.preventDefault();
            return false;

        case 32: // space
            this.displayDetails(event);
            event.stopPropagation();
            event.preventDefault();
            return false;
        }
        return true;
    },
    displayDetails : function(event)
    {
        var item = this.getSelected();
        if (item == null) return;
        var rc = { core: this.core, item: item, title: className(item), };
        if (!this.core.win.details) {
            this.core.win.details = window.openDialog("chrome://ew/content/dialogs/details.xul", null, "chrome,centerscreen,modeless,resizable", rc);
        } else
        if (this.core.win.details.setup) {
            this.core.win.details.setup.call(this.core.win.details, rc);
        }
    },
    deleteSelected : function ()
    {
        var item = this.getSelected();
        if (!item) return false;
        if (!confirm('Delete ' + item.toString() + '?')) return false;
        return true;
    },
    getInputItems: function()
    {
        if (!this.tab) return [];
        var panel = $(this.tab.name);
        if (!panel) return [];
        var toolbars = panel.getElementsByTagName('toolbar');
        var types = ['textbox' ,'checkbox', 'menulist', 'listbox'];
        var items = [];
        for (var t = 0; t < toolbars.length; t++) {
            for (var i in types) {
                var list = toolbars[t].getElementsByTagName(types[i]);
                for (var j = 0; j < list.length; j++) {
                    items.push({ id: list[j].id, type: types[i], value: list[j].value, checked: list[j].checked });
                }
            }
        }
        return items;
    },
    restorePreferences: function()
    {
        var items = this.getInputItems();
        for (var i in items) {
            switch (items[i].type) {
            case "checkbox":
                $(items[i].id).checked = this.core.getBoolPrefs(items[i].id, false);
                break;

            case "menulist":
                var val = this.core.getStrPrefs(items[i].id, '#');
                if (val != '#') $(items[i].id).value = val;
                break;

            default:
                $(items[i].id).value = this.core.getStrPrefs(items[i].id);
            }
        }
    },
    savePreferences: function()
    {
        var items = this.getInputItems();
        for (var i in items) {
            switch (items[i].type) {
            case "checkbox":
                this.core.setBoolPrefs(items[i].id, items[i].checked);
                break;

            default:
                this.core.setStrPrefs(items[i].id, items[i].value);
            }
        }
    },
    focus: function()
    {
        if (this.tree) this.tree.focus();
    },
    init: function(tree, tab, core)
    {
        this.core = core;
        // Tree owner and tab object, tab with owner field refers to the primary tab object
        tree.view = this;
        this.tree = tree;
        this.tab = tab;

        // Search text box, one per attached toolbar, need to keep reference for fast access to text
        if (!this.searchElement) {
            // Try naming convertion by name or model name
            var search = $("ew." + this.getName() + ".search");
            if (search) this.searchElement = search.id;
        }
        // Wrapping handlers to preserve correct context for 'this'
        if (!tab.owner) {
            (function(v) { var me = v; tree.addEventListener('dblclick', function(e) { e.stopPropagation();me.displayDetails(e); }, false); }(this));
            (function(v) { var me = v; tree.addEventListener('select', function(e) { e.stopPropagation();me.selectionChanged(e); }, false); }(this));
            (function(v) { var me = v; tree.addEventListener('click', function(e) { e.stopPropagation();me.clicked(e); }, false); }(this));
            (function(v) { var me = v; tree.addEventListener('keydown', function(e) { return me.onKeydown(e); }, false); }(this));

            // Install hanlders for search textbox
            if (this.searchElement) {
                var textbox = $(this.searchElement);
                if (textbox) {
                    textbox.setAttribute("type", "autocomplete");
                    textbox.setAttribute("autocompletesearch", "form-history");
                    (function(v) { var me = v; textbox.addEventListener('keypress', function(e) { e.stopPropagation();me.searchChanged(e); }, false); }(this));
                } else {
                    debug('search textbox ' + this.searchElement + " not found");
                }
            }

            // Install handlers for menu popups
            var popup = $("ew." + this.getName() + ".contextmenu");
            if (popup) {
                (function(v) { var me = v; popup.addEventListener('popupshowing', function(e) { e.stopPropagation();me.menuChanged(e); }, false); }(this));
                (function(v) { var me = v; popup.addEventListener('popuphidden', function(e) { e.stopPropagation();me.menuHidden(e); }, false); }(this));
            }
        }
        // Register to receive model updates
        if (this.model) {
            this.core.registerInterest(this, this.model);
        }
    },
};

// Dynamic multicolumn listbox
var ListBox = {
    headers: [],
    name: 'listbox',
    title: null,
    columns: null,
    multiple: true,
    width: 400,
    rows: 10,
    items: [],
    checkedItems: [],
    checkedProperty: null,
    selectedIndex: -1,
    selectedItems: [],
    core: null,
    onclick: null,
    listbox: null,

    done: function()
    {
        if (!this.name || !this.listbox) return false;
        this.selectedIndex = this.listbox.currentIndex;
        this.selectedItems = [];
        if (this.multiple) {
            for (var i = 0; i < this.items.length; i++) {
                var cell = $(this.name + '.check' + i);
                var checked = cell ? toBool(cell.getAttribute('checked')) : false;
                if (checked) {
                    this.selectedItems.push(this.items[i]);
                }
            }
        } else {
            this.selectedItems.push(this.items[this.currentIndex]);
        }
        return true;
    },

    init: function(params)
    {
        for (var p in params) {
            if (typeof params[p] == "undefined" || params[p] == null) continue;
            this[p] = params[p];
        }
        this.selectedIndex = -1;
        this.selectedItems = [];
        if (!this.name) return;
        this.listbox = $(this.name);
        if (!this.listbox) return;
        if (this.width) this.listbox.width = this.width;
        this.listbox.setAttribute('rows', this.rows || 10);
        this.listbox.onclick = null;

        var list = this.listbox;
        (function(v) { var me = v; list.addEventListener('click', function(e) { e.stopPropagation();me.selectionChanged(e); }, false); }(this));
        (function(v) { var me = v; list.addEventListener('keydown', function(e) { return me.onKeydown(e); }, false); }(this));
        this.create();
    },

    create: function()
    {
        clearElement(this.listbox);
        this.createHeader();
        this.createData();
    },

    createHeader: function()
    {
        var head = document.createElement('listhead');
        head.setAttribute('flex', '1');
        this.listbox.appendChild(head);
        var cols = document.createElement('listcols');
        cols.setAttribute('flex', '1');
        this.listbox.appendChild(cols);

        if (this.headers && this.headers.length) {
            if (this.multiple) {
                var hdr = document.createElement('listheader');
                hdr.setAttribute('flex', '1');
                hdr.setAttribute('id', this.name + '.header0');
                hdr.setAttribute('label', this.headers[0]);
                head.appendChild(hdr);
                hdr = document.createElement('listheader');
                hdr.setAttribute('id', this.name + '.header1');
                hdr.setAttribute('flex', '2');
                hdr.setAttribute('label', this.headers.length>1 ? this.headers[1] : this.title);
                head.appendChild(hdr);
                var col = document.createElement('listcol');
                cols.appendChild(col);
                col = document.createElement('listcol');
                col.setAttribute('flex', '1');
                cols.appendChild(col);
            } else {
                var hdr = document.createElement('listheader');
                hdr.setAttribute('id', this.name + '.header1');
                hdr.setAttribute('flex', '2');
                hdr.setAttribute('label', this.headers[0]);
                head.appendChild(hdr);
                var col = document.createElement('listcol');
                col.setAttribute('flex', '2');
                cols.appendChild(col);
            }
        }
    },

    createData: function()
    {
        for (var i = 0; i < this.items.length; i++) {
            if (this.items[i] == null) continue;
            var val = this.toItem(this.items[i]);
            if (this.multiple) {
                var row = document.createElement('listitem');
                var cell = document.createElement('listcell');
                cell.setAttribute('type', 'checkbox');
                cell.setAttribute('crop', 'end');
                cell.setAttribute('id', this.name + '.check' + i);
                // Check if this item is already selected
                for (var j in this.checkedItems) {
                    if (this.items[i] == this.checkedItems[j]) {
                        cell.setAttribute('checked', 'true');
                        break;
                    }
                }
                row.appendChild(cell);
                cell = document.createElement('listcell');
                cell.setAttribute('label', val);
                row.setAttribute('tooltiptext', val);
                row.appendChild(cell);
                this.listbox.appendChild(row);
            } else {
                var row = document.createElement('listitem');
                var cell = document.createElement('listcell');
                cell.setAttribute('crop', 'end');
                cell.setAttribute('label', val);
                row.setAttribute('tooltiptext', val);
                for (var j in this.checkedItems) {
                    if (this.items[i] == this.checkedItems[j]) {
                        this.listbox.selectedIndex = i;
                    }
                }
                row.appendChild(cell);
                this.listbox.appendChild(row);
            }
        }
    },

    selectionChanged: function()
    {
        var self = this;
        var checked = false;
        if (this.listbox.currentIndex == -1) return;
        if (this.multiple) {
            var cell = $(this.name + '.check' + this.listbox.currentIndex);
            if (cell) {
                checked = !toBool(cell.getAttribute('checked'));
                cell.setAttribute('checked', checked);
            }
            if (this.checkedProperty) {
                this.items[this.listbox.currentIndex][this.checkedProperty] = checked;
            }
        }
        if (this.onclick) setTimeout(function() {self.onclick.call(self, self.items[self.listbox.currentIndex], checked);}, 10);
    },

    onKeydown: function(event)
    {
        switch (event.keyCode) {
        case 32:
            this.selectionChanged();
            event.stopPropagation();
            event.preventDefault();
            return false;
        }
        return true;
    },

    // Convert object into plain text to be used by list box
    toItem: function(obj)
    {
        return this.core.toString(obj, this.columns);
    },
};

// Create new instance of the list box
function ListView(params)
{
    this.init(params);
}
ListView.prototype = ListBox;

var FileIO = {
    exists : function(path)
    {
        try {
            var file = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(path);
            return file.exists();
        }
        catch (e) {
            return false;
        }
    },

    remove : function(path)
    {
        try {
            var file = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(path);
            return file.remove(false);
        }
        catch (e) {
            return false;
        }
    },

    rename: function(path, newname)
    {
        try {
            var file = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(path);
            return file.moveTo(null, newname);
        }
        catch (e) {
            return false;
        }
    },

    open : function(path)
    {
        try {
            var file = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(path);
            return file;
        }
        catch (e) {
            return false;
        }
    },

    streamOpen : function(file)
    {
        try {
            var fd = this.open(file);
            var fStream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
            var sStream = Components.classes["@mozilla.org/network/buffered-input-stream;1"].createInstance(Components.interfaces.nsIBufferedInputStream);
            fStream.init(fd, 1, 0, false);
            sStream.init(fStream, 9000000);
            return [fStream, sStream, fd];
        }
        catch (e) {
            return null;
        }
    },

    streamClose: function(file)
    {
        try { if (file && file[0]) file[0].close(); } catch(e) {}
        try { if (file && file[1]) file[1].close(); } catch(e) {}
        try { if (file && file[3]) file[3].close(); } catch(e) {}
    },

    read : function(file)
    {
        try {
            var data = new String();
            var fStream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
            var sStream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
            fStream.init(file, 1, 0, false);
            sStream.init(fStream, "UTF-8", 0, 0);
            while (1) {
                var str = {};
                var read = sStream.readString(32*1024, str);
                if (read <= 0) break;
                data += str.value;
            }
            sStream.close();
            fStream.close();
            return data;
        }
        catch (e) {
            debug("FileIO: read: " + e);
            return false;
        }
    },

    readBinary: function(file, base64)
    {
        try {
            var fStream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
            var bStream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
            fStream.init(file, 1, 0, false);
            bStream.setInputStream(fStream);
            var data = bStream.readByteArray(bStream.available());
            bStream.close();
            fStream.close();
            if (base64) {
                data = Base64.encode(data);
            }
            return data;
        }
        catch(e) {
            debug("FileIO: readBinary: " + e);
            return false;
        }
    },

    write : function(file, data, mode, charset)
    {
        try {
            var fStream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
            if (charset) {
                data = this.fromUnicode(charset, data);
            }
            var flags = 0x02 | 0x08 | 0x20; // wronly | create | truncate
            if (mode == 'a') {
                flags = 0x02 | 0x08 | 0x10; // wronly | create | append
            }
            fStream.init(file, flags, 0600, 0);
            fStream.write(data, data.length);
            fStream.close();
            return true;
        }
        catch (e) {
            debug("FileIO: write: " + e);
            return false;
        }
    },

    create : function(file)
    {
        try {
            file.create(0x00, 0600);
            return true;
        }
        catch (e) {
            debug('Error:' + e);
            return false;
        }
    },

    createUnique: function(file)
    {
        try {
            file.createUnique(0x00, 0600);
            return true;
        }
        catch (e) {
            debug('Error:' + e);
            return false;
        }
    },

    unlink : function(file)
    {
        try {
            file.remove(false);
            return true;
        }
        catch (e) {
            return false;
        }
    },

    path : function(file)
    {
        try {
            return 'file:///' + file.path.replace(/\\/g, '\/').replace(/^\s*\/?/, '').replace(/\ /g, '%20');
        }
        catch (e) {
            return false;
        }
    },

    toUnicode : function(charset, data)
    {
        try {
            var uniConv = Components.classes['@mozilla.org/intl/scriptableunicodeconverter'].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
            uniConv.charset = charset;
            data = uniConv.ConvertToUnicode(data);
        }
        catch (e) {
        }
        return data;
    },

    toString : function(path)
    {
        if (!path) return "";
        try {
            return this.read(this.open(path));
        }
        catch (e) {
            debug("Error: toString:" + path + ": " + e);
            return "";
        }
    },

    fromUnicode : function(charset, data)
    {
        try {
            var uniConv = Components.classes['@mozilla.org/intl/scriptableunicodeconverter'].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
            uniConv.charset = charset;
            data = uniConv.ConvertFromUnicode(data);
        }
        catch (e) {
        }
        return data;
    },

};

// Directory service get properties
// ProfD profile directory
// DefProfRt user (for example /root/.mozilla)
// UChrm %profile%/chrome
// DefRt %installation%/defaults
// PrfDef %installation%/defaults/pref
// ProfDefNoLoc %installation%/defaults/profile
// APlugns %installation%/plugins
// AChrom %installation%/chrome
// ComsD %installation%/components
// CurProcD installation (usually)
// Home OS root (for example /root)
// TmpD OS tmp (for example /tmp)
// ProfLD Local Settings on windows; where the network cache and fastload files are stored
// resource:app application directory in a XULRunner app
// Desk Desktop directory (for example ~/Desktop on Linux, C:\Documents and Settings\username\Desktop on Windows)
// Progs User start menu programs directory (for example C:\Documents and Settings\username\Start Menu\Programs)

var DirIO = {
    slash : navigator.platform.toLowerCase().indexOf('win') > -1 ? '\\' : '/',

    get : function(type)
    {
        try {
            return Components.classes['@mozilla.org/file/directory_service;1'].createInstance(Components.interfaces.nsIProperties).get(type, Components.interfaces.nsIFile);
        }
        catch (e) {
            return false;
        }
    },

    open : function(path)
    {
        return FileIO.open(path);
    },

    create : function(dir, mode)
    {
        try {
            dir.create(0x01, 0600);
            return true;
        }
        catch (e) {
            debug('Error:' + e);
            return false;
        }
    },

    remove : function(path, recursive)
    {
        return this.unlink(this.open(path), recursive);
    },

    mkpath: function(path)
    {
        try {
            var i = 0;
            var dirs = path.split(this.slash);
            if (dirs.length == 0) return 0;
            if (isWindows(navigator.platform)) {
                path = dirs[0];
                i++;
            } else {
                path = "";
            }
            while (i < dirs.length) {
                path += this.slash + dirs[i];
                if (!FileIO.exists(path) && !DirIO.create(FileIO.open(path))) {
                    return false;
                }
                i++;
            }
            return true;
        }
        catch (e) {
            debug('Error:' + e);
            return false;
        }
    },

    read : function(dir, recursive)
    {
        var list = new Array();
        try {
            if (dir.isDirectory()) {
                if (recursive == null) {
                    recursive = false;
                }
                var files = dir.directoryEntries;
                list = this._read(files, recursive);
            }
        }
        catch (e) {
        }
        return list;
    },

    _read : function(dirEntry, recursive)
    {
        var list = new Array();
        try {
            while (dirEntry.hasMoreElements()) {
                list.push(dirEntry.getNext().QueryInterface(Components.interfaces.nsILocalFile));
            }
            if (recursive) {
                var list2 = new Array();
                for ( var i = 0; i < list.length; ++i) {
                    if (list[i].isDirectory()) {
                        var files = list[i].directoryEntries;
                        list2 = this._read(files, recursive);
                    }
                }
                for (i = 0; i < list2.length; ++i) {
                    list.push(list2[i]);
                }
            }
        }
        catch (e) {
        }
        return list;
    },

    unlink : function(dir, recursive)
    {
        try {
            dir.remove(recursive ? true : false);
            return true;
        }
        catch (e) {
            return false;
        }
    },

    path : function(dir)
    {
        return FileIO.path(dir);
    },

    makepath: function()
    {
        var path = [];
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] != "") path.push(arguments[i]);
        }
        return path.join(this.slash);
    },

    split : function(str, join)
    {
        var arr = str.split(/\/|\\/), i;
        str = new String();
        for (i = 0; i < arr.length; ++i) {
            if (arr[i] == '') continue;
            str += arr[i] + ((i != arr.length - 1) ? join : '');
        }
        return str;
    },

    join : function(str, split)
    {
        var i, arr = str.split(split);
        str = new String();
        for (i = 0; i < arr.length; ++i) {
            if (arr[i] == '') continue;
            str += arr[i] + ((i != arr.length - 1) ? this.slash : '');
        }
        return str;
    },

    fileName: function(path)
    {
        var arr = path.split(/\/|\\/);
        return arr.length ? arr[arr.length - 1] : "";
    },

    dirName: function(path)
    {
        var arr = path.split(/\/|\\/);
        return arr.slice(0, arr.length - 1).join(this.slash);
    },

    baseName: function(path)
    {
        return this.fileName(path).split(".")[0];
    },
};

// Base64 encode / decode http://www.webtoolkit.info/javascript-base64.html
var Base64 = {
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    encode : function(input)
    {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var chr2g, chr3g;
        var i = 0;

        if (typeof input === 'string') {
            input = toByteArray(input);
        }

        while (i < input.length) {
            // Initialize all variables to 0
            chr1 = chr2 = chr3 = 0;
            chr2g = chr3g = true;

            if (i < input.length)
                chr1 = input[i++];

            if (i < input.length)
                chr2 = input[i++];
            else chr2g = false;

            if (i < input.length)
                chr3 = input[i++];
            else chr3g = false;

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (!chr2g) {
                enc3 = enc4 = 64;
            } else if (!chr3g) {
                enc4 = 64;
            }
            output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
        }

        return output;
    },

    // public method for decoding
    decode : function(input)
    {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        while (i < input.length) {
            chr1 = chr2 = chr3 = 0;
            enc2 = enc3 = enc4 = 0;
            enc1 = this._keyStr.indexOf(input.charAt(i++));
            if (i < input.length) enc2 = this._keyStr.indexOf(input.charAt(i++));
            if (i < input.length) enc3 = this._keyStr.indexOf(input.charAt(i++));
            if (i < input.length) enc4 = this._keyStr.indexOf(input.charAt(i++));
            chr1 = (enc1 << 2) | ((enc2 & 0x30) >> 4);
            chr2 = ((enc2 & 15) << 4) | ((enc3 & 0x3c) >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
            output = output + String.fromCharCode(chr1);
            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
        }
        return output;

    },

    // private method for UTF-8 encoding
    _utf8_encode : function(string)
    {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";

        for ( var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else
                if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                } else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }

        }
        return utftext;
    },

    // private method for UTF-8 decoding
    _utf8_decode : function(utftext)
    {
        var string = "";
        var i = 0;
        var c1 = 0, c2 = 0, c3 = 0;

        while (i < utftext.length) {
            c1 = utftext.charCodeAt(i);
            if (c1 < 128) {
                string += String.fromCharCode(c1);
                i++;
            } else
                if ((c1 > 191) && (c1 < 224)) {
                    c2 = utftext.charCodeAt(i + 1);
                    string += String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
                    i += 2;
                } else {
                    c2 = utftext.charCodeAt(i + 1);
                    c3 = utftext.charCodeAt(i + 2);
                    string += String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }

        }
        return string;
    },
};

// Heavily modified jsgraph library for charts using HTML5 Canvas, original author's message is below:
//
//   Copyright (c) 2010 Daniel 'Haribo' Evans
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
//   files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use,
//   copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
//   Software is furnished to do so, subject to the following conditions:
//   The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

function Point(x, y, color, label)
{
    this.x = typeof x == "string" ? parseInt(x) : x;
    this.y = typeof y == "string" ? parseFloat(y) : y;
    this.color = color;
    this.label = label;
}

function Series(name, color)
{
    this.name = name;
    this.color = color;
    this.points = new Array();
}

function Graph(title, element, type, core)
{
    this.options = { type : "line",
                     barOverlap : false,
                     barWidth : 1,
                     vstep : "auto",
                     vstart : "auto",
                     vfinish : "auto",
                     hstart : "auto",
                     hfinish : "auto",
                     title : "",
                     xlabel : "",
                     ylabel: "",
                     fillColor : "",
                     seriesColor: ["blue", "red", "green", "brown"],
                     canvasName : null,
                     leftSpace: 35,
                     rightSpace: 35,
                     textcol: "rgb(0,0,0)",
                     linecol: "rgb(240,240,240)",
                     keypos: "right",
                     barwidth: 1,
                     fontname: "sans-serif",
                     fontsize: 11 };



    this.options.title = title;
    this.options.canvasName = element;
    this.options.type = type;
    this.core = core;

    this.reset = function()
    {
        this.series = new Array();
        this.addSeries('');
    };

    this.addSeries = function(name, color)
    {
        this.lastSeries = new Series(name, color || this.options.seriesColor[this.series.length]);
        this.series[this.series.length] = this.lastSeries;
    };
    this.reset();

    this.addPoint = function(x, y, label)
    {
        this.lastSeries.points[this.lastSeries.points.length] = new Point(x, y, this.lastSeries.color, label);
    };

    this.vmin = function()
    {
        if (this.options.vstart != "auto" && !isNaN(this.options.vstart)) {
            return this.options.vstart;
        }
        var min = 1000000;
        for (var q = 0; q < this.series.length; q++) {
            var ser = this.series[q];
            for (var m = 0; m < ser.points.length; m++) {
                if (ser.points[m].y < min) min = ser.points[m].y;
            }
        }
        if (this.options.type == "bar" && min > 0) {
            // Hack for bar charts, this could be handled much better.
            min = 0;
        }
        return min;
    };

    this.vmax = function()
    {
        if (this.options.vfinish != "auto" && !isNaN(this.options.vfinish)) {
            return this.options.vfinish;
        }
        var max = -1000000;
        for (var q = 0; q < this.series.length; q++) {
            var ser = this.series[q];
            for (var m = 0; m < ser.points.length; m++) {
                if (ser.points[m].y > max) max = ser.points[m].y;
            }
        }
        return max;
    };

    this.min = function()
    {
        if (this.options.hstart != "auto" && !isNaN(this.options.hstart)) {
            return this.options.hstart;
        }
        var min = 1000000;
        for (var q = 0; q < this.series.length; q++) {
            var sers = this.series[q];
            for (var m = 0; m < sers.points.length; m++) {
                if (sers.points[m].x < min) min = sers.points[m].x;
            }
        }
        return min;
    };

    this.max = function()
    {
        if (this.options.hfinish != "auto" && !isNaN(this.options.hfinish)) {
            return this.options.hfinish;
        }
        var max = -1000000;
        for (var q = 0; q < this.series.length; q++) {
            var ser = this.series[q];
            for (var m = 0; m < ser.points.length; m++) {
                if (ser.points[m].x > max) max = ser.points[m].x;
            }
        }
        return max;
    };

    this.range = function()
    {
        var min = this.min();
        var max = this.max();
        if (max - min == 0) return 1;
        return max - min;
    };

    this.vrange = function()
    {
        var min = this.vmin();
        var max = this.vmax();
        if (max - min == 0) return 1;
        return max - min;
    };

    this.draw = function()
    {
        var canvas = document.getElementById(this.options.canvasName);
        // Default Y axis label for the single series
        if (this.options.ylabel && this.series.length && !this.series[0].name) this.series[0].name = this.options.ylabel;

        // Show table with data points in accessibility mode
        if (this.core.getBoolPrefs("ew.accessibility", false)) {
            clearElement(canvas);
            if (!this.series.length) return;
            var series = this.series[0];

            var head = makeElement('listhead');
            canvas.appendChild(head);
            var cols = makeElement('listcols');
            canvas.appendChild(cols);
            head.appendChild(makeElement('listheader', 'label', this.options.xlabel));
            head.appendChild(makeElement('listheader', 'label', series.name || this.options.title));
            cols.appendChild(makeElement('listcol', 'flex', '2'));
            cols.appendChild(makeElement('listcol', 'flex', '1'));

            for (var i = 0; i < series.points.length; i++) {
                var p = series.points[i];
                var row = makeElement('listitem', 'title', p.label + ":" + p.y);
                var cell = makeElement('listcell', 'label', p.label, 'crop', 'end');
                row.appendChild(cell);
                cell = makeElement('listcell', 'label', p.y, 'crop', 'end');
                row.appendChild(cell);
                canvas.appendChild(row);
            }
            return;
        }

        canvas.setAttribute("alt", this.options.title);
        canvas.setAttribute("tooltiptext", this.options.title);
        var ctx = canvas.getContext('2d');

        // Clear the canvas
        if (this.options.fillColor != "") {
            var origFil = ctx.fillStyle;
            ctx.fillStyle = this.options.fillColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = origFil;
        } else {
            canvas.width = canvas.width;
        }

        ctx.font = this.options.fontsize + "px " + this.options.fontname;
        ctx.textBaseline = "top";
        var hMin = this.min();
        var vMin = this.vmin();
        var vRange = this.vrange();
        var topSpace = this.options.fontsize * 1.5;
        var bottomSpace = (this.options.fontsize + 4) * (this.options.xlabel ? 2 : 1);
        var leftSpace = this.options.leftSpace;
        var rightSpace = this.options.rightSpace;

        if (this.options.keypos != '' && this.lastSeries.name != '') {
            ctx.textBaseline = "top";
            // Find the widest series name
            var widest = 1;
            for (var k = 0; k < this.series.length; k++) {
                if (ctx.measureText(this.series[k].name).width > widest) widest = ctx.measureText(this.series[k].name).width;
            }
            if (this.options.keypos == 'right') {
                rightSpace += widest + 22;
                ctx.strokeRect(canvas.width - rightSpace + 4, 18, widest + 20, ((this.series.length + 1) * 12) + 4);
                ctx.fillText("Key", canvas.width - rightSpace + 6, 20);
                for (var k = 0; k < this.series.length; k++) {
                    ctx.fillText(this.series[k].name, canvas.width - rightSpace + 18, 20 + (12 * (k + 1)));
                    ctx.save();
                    ctx.fillStyle = this.series[k].color;
                    ctx.fillRect(canvas.width - rightSpace + 8, 21 + (12 * (k + 1)), 8, 8);
                    ctx.restore();
                }
            }
        }

        // Adjust spacing from the left/right based on the labels abd values
        var tw = ctx.measureText((vMin + vRange).toFixed(2)).width;
        if (leftSpace <= tw) leftSpace = tw + 4;

        if (this.series[0].points.length) {
            var label = this.series[0].points[0].label;
            tw = ctx.measureText(label).width;
            if (leftSpace <= tw/2) leftSpace = tw/2 + 4;
            label = this.series[0].points[this.series[0].points.length - 1].label;
            tw = ctx.measureText(label).width;
            if (rightSpace <= tw/2) rightSpace = tw/2 + 4;
        }

        var width = canvas.width - leftSpace - rightSpace;
        var height = canvas.height - topSpace - bottomSpace;
        var vScale = height / this.vrange();
        var hScale = width / (this.range() + (this.options.type == "bar" ? 1 : 0));
        var spacing;

        // Draw title & Labels
        ctx.textAlign = "center";
        ctx.fillStyle = this.options.textcol;
        ctx.fillText(this.options.title, canvas.width / 2, 2, canvas.width);
        ctx.textBaseline = "bottom";
        ctx.fillText(this.options.xlabel, canvas.width / 2, canvas.height - 2, canvas.width);
        ctx.textAlign = "left";

        if (this.options.vstep != "auto" && !isNaN(this.options.vstep)) {
            spacing = this.options.vstep;
        } else {
            spacing = vRange / this.options.fontsize * 2;
        }

        var pos = 0, count = 0;
        for (var i = vMin; i <= vMin + vRange; i += spacing) {
            var y = (canvas.height - bottomSpace) - (i) * vScale + (vMin * vScale);
            if (pos > 0 && pos - y < this.options.fontsize * 2) continue;
            pos = y;
            // Value label
            ctx.textBaseline = "bottom";
            ctx.textAlign = "right";
            ctx.fillStyle = this.options.textcol;
            ctx.fillText(i.toFixed(2), leftSpace - 2, y);
            ctx.fillStyle = this.options.linecol;
            // Horizontal lines
            if (i == vMin || i == vMin + vRange) continue;
            ctx.strokeStyle = "rgb(220,220,220)";
            ctx.beginPath();
            ctx.moveTo(leftSpace, y);
            ctx.lineTo(canvas.width - rightSpace, y);
            ctx.stroke();
            ctx.strokeStyle = "rgb(0,0,0)";
        }

        // Vertical lines with labels
        var pos = 0;
        for (var p = 0; p < this.series[0].points.length; p++) {
            var curr = this.series[0].points[p];
            if (!curr.label) continue;
            var y = canvas.height - bottomSpace;
            var x = hScale * (curr.x - hMin) + leftSpace;
            var tw = ctx.measureText(curr.label).width;
            if (pos > 0 && x - pos <= tw + this.options.fontsize + 4) continue;
            pos = x;
            // Time label
            ctx.textBaseline = "top";
            ctx.textAlign = "center";
            ctx.fillStyle = this.options.textcol;
            ctx.fillText(curr.label, x, y + 3);
            ctx.fillStyle = this.options.linecol;
            // Vertical line
            if (x <= leftSpace || x >= width) continue;
            ctx.strokeStyle = "rgb(220,220,220)";
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, topSpace);
            ctx.stroke();
            ctx.strokeStyle = "rgb(0,0,0)";
        }

        for (var s = 0; s < this.series.length; s++) {
            var series = this.series[s];
            ctx.beginPath();
            for (var p = 0; p < series.points.length; p++) {
                var curr = series.points[p];
                // Move point into graph-space
                var y = (canvas.height - bottomSpace) - (curr.y) * vScale + (vMin * vScale);
                var x = hScale * (curr.x - hMin) + leftSpace;
                count++;

                switch (this.options.type) {
                case "line":
                case "scatter":
                    if (this.options.type == "line") {
                        // Main line
                        ctx.lineTo(x, y);
                    }
                    // Draw anchor for this point
                    ctx.fillStyle = curr.color;
                    ctx.fillRect(x - 2, y - 2, 4, 4);
                    ctx.fillStyle = "rgb(0,0,0)";
                    break;

                case "bar":
                    ctx.fillStyle = curr.color;
                    var barwidth = hScale;
                    if (this.options.barWidth != null && this.options.barWidth <= 1) {
                        barwidth *= this.options.barWidth;
                    }
                    var baroffs = ((this.options.barWidth < 1) ? ((1 - this.options.barWidth) / 2) * hScale : 0);
                    barwidth /= (this.options.barOverlap ? 1 : this.series.length);
                    var seriesWidth = (!this.options.barOverlap ? barwidth : 0);
                    ctx.fillRect((x + baroffs) + seriesWidth * s, y, barwidth, (curr.y * vScale));
                    ctx.fillStyle = "rgb(0,0,0)";
                    break;
                }
            }
            ctx.stroke();
        }

        // Draw border of graph
        if (count) {
            ctx.strokeRect(leftSpace, topSpace, canvas.width - leftSpace - rightSpace, canvas.height - topSpace - bottomSpace);
        }
    };
}

function Endpoint(name, type, ec2_url, s3_url)
{
    this.ec2_url = ec2_url || "http://ec2.us-east-1.amazonaws.com";
    this.s3_url = s3_url || "http://s3.amazonaws.com";
    this.type = type || "AWS";
    if (!name) {
        this.name = this.ec2_url.replace(/(https?:\/\/|ec2|amazonaws|com|\.)/g, "")
    } else {
        this.name = name;
    }

    this.toString = function() {
        return this.name + fieldSeparator + this.ec2_url;
    }
}

function Credential(name, accessKey, secretKey, url, securityToken, expire)
{
    this.name = name;
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.ec2_url = typeof url == "string" ? url : "";
    this.securityToken = typeof securityToken == "string" ? securityToken : "";
    this.status = "";
    this.expire = expire instanceof Date || (typeof expire == "object" && expire.getTime) ? expire.getTime() : (!isNaN(parseInt(expire)) ? parseInt(expire) : 0);
    this.type = this.expire > 0 || this.securityToken != "" ? "Temporary" : "";
    this.expirationDate =  this.expire > 0 ? new Date(this.expire) : "";

    this.toString = function() {
        return this.accessKey + ";;" + this.secretKey + ";;" + this.ec2_url + ";;" + this.securityToken + ";;" + this.expire;
    }
}

function S3Bucket(name, mtime, owner, ownerAlias)
{
    this.name = name;
    this.mtime = mtime;
    this.owner = owner;
    this.ownerAlias = ownerAlias;
    this.region = "";
    this.acls = null;
    this.keys = [];
    this.indexSuffix = "";
    this.errorKey = "";
    this.toString = function() {
        return this.name;
    };
}

function S3BucketAcl(id, type, name, permission)
{
    this.id = id;
    this.type = type;
    this.name = name;
    this.permission = permission;
    this.toString = function() {
       return (this.name ? this.name : this.id ? this.id : "ALL") + "=" + this.permission;
    };
}

// Create an object with list of pairs describing properties in the form name, value, ...
function Element()
{
    for (var i = 0; i < arguments.length; i+= 2) {
        this[arguments[i]] = arguments[i + 1];
    }

    this.toString = function() {
        var self = this;
        return Object.keys(this).filter(function(x) {
            return typeof self[x] != "function" && !empty(self[x]);
        }).map(function(x) {
            return ew_core.modelValue(x, self[x], self._showNames);
        }).join(fieldSeparator);
    };
}

function Tag(name, value, id, type, propagate)
{
    this.name = name || "";
    this.value = value || "";
    this.resourceId = id || "";
    this.resourceType = type || "";
    this.propagateAtLaunch = propagate || false;

    this.toString = function() {
        return this.name + ":" + (this.value.match(/[,:]+/) ? '"' + this.value + '"' : this.value);
    };
}




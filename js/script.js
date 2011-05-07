/* 
 * Query the php proxy; ajaxified.
 * Settings are: LocalCurrency, Sites, Category
 * Parameters are: Context; Keywords or ItemId (Asin) 
 * Accepts: json result array to visualize as table
 */
/*
 * register global constants with the window object
 */
window.DEFAULT_SEARCHTEXT = 'enter search term here';
window.DEFAULT_STORES = ['CA', 'DE', 'FR', 'JP', 'UK', 'US'];
window.DEFAULT_CATEGORY = 'All';
window.DEFAULT_LOCAL = 'US';
// default sort by list price ascending
window.DEFAULT_ID_SORT_COL = 'Amazon';
window.DEFAULT_ID_SORT_ORDER = false; // i.e. descending = false

window.container = new Container(); // global data storage; TODO replace this with message passing

/*
 * AJAX default parameters
 */
$.ajaxSetup({
	dataType: 'json',
	type: 'GET',
	url: 'http://127.0.0.1/~chm/AmazonGlobal/php/aws.php'
});	

/*
 * Register event handlers with call-backs.
 */
$(document).ready(function() {
	cb_page_init();
		
	$('#searchbar').keypress(function(event) {
		if (event.keyCode == 13) {
			cb_searchbtn_clicked();
		}
	});
	$('#searchbtn').click(function() {
		cb_searchbtn_clicked();
	});
	
	$('#configbtn').click(function() {
		cb_configbtn_clicked();
	});
	$('#selectable_stores > li').mousedown(function() {
		cb_selecting_store($(this));	
    });
	$('#selectable_stores > li').click(function() {
		cb_selected_store($(this));
    });
	$('#selectable_locals > li').mousedown(function() {
		cb_selecting_locals($(this));	
    });
	$('#selectable_locals > li').click(function() {
		cb_selected_locals($(this));
    });
	$('#selectable_categories > li').mousedown(function() {
		cb_selecting_categories($(this));
    });
	$('#selectable_categories > li').click(function() {
		cb_selected_categories($(this));
    });

});

/*
 * Call-back functions
 */
function cb_page_init() { 
	var settings = new Settings();
	settings.restore();
}

function cb_id_page_init() {
	$('.table_heading').click(function() {
		cb_table_heading_clicked($(this).attr('id'));
	});	
}

function cb_selecting_store(object) {
	object.addClass("selecting").siblings().removeClass("selecting");	
}

function cb_selected_store(object) {
	object.removeClass("selecting");
	object.toggleClass("selected");	
}

function cb_selecting_categories(object) {
	object.addClass("selecting").siblings().removeClass("selecting");	
}

function cb_selected_categories(object) {
	object.removeClass("selecting");
	object.addClass("selected").siblings().removeClass("selected");
}

function cb_selecting_locals(object) {
	object.addClass("selecting").siblings().removeClass("selecting");		
}

function cb_selected_locals(object) {
	object.removeClass("selecting");
	object.addClass("selected").siblings().removeClass("selected");	
}

function cb_searchbtn_clicked() {
	if (($('#searchbar').val() != '') &&                // no vane searches
		($('#searchbar').val() != window.DEFAULT_SEARCHTEXT)) {
		var context = "keywords";
	// remember settings
	var settings = new Settings();
	settings.save();
	// start search
  	var keywords_search = new InputHandler(context);
  	var params = keywords_search.collect_parameters($('#searchbar').val());
  	var query = new RequestAgent(context);
  	query.query_server(params);
  }
}

function cb_table_heading_clicked(string_id) {
	console.log('click on ' + string_id);
	console.log(window.container);
	var current_container = window.container.get();
	var presentation = new Presenter();
	presentation.set(current_container[0], current_container[2]);
	var column = string_id;
	// TODO add class ascending/descending to sort column, read out here
	// and fill in for order below:
	presentation.view(column, !order); // toggle order
}


function cb_configbtn_clicked() {
	
}

function querySucceeded(context) {
	return function(json, status) {
		window.container.set(context, json);
		var presentation = new Presenter();
		presentation.set(context, json);
		presentation.view();
	};
};

function queryFailed(context) {
	return function(json, status) {
		// call Viewer class with context and json
	};
};

function table_row_clicked() {
	//console.log('row: ' + $(this).attr('id') + ' clicked');
	var context = "id";
	var keywords_search = new InputHandler(context);
	var params = keywords_search.collect_parameters($(this).attr('id'));
	var query = new RequestAgent(context);
	query.query_server(params);
};

function shop_clicked(url) {
	return function() {
		window.open(url);
	};
};
/*
 * Model class for in-session data storage
 */
function Container() {
	this.context = new String();
	this.json = new Object();
}

Container.prototype.set = function(context, json) {
	this.context = context;
	this.json = json;
}

Container.prototype.get = function() {
	return [this.context, this.json];
}


/*
 * Controller classes
 */

/**
 * InputHandler 
 * @class InputHandler: collects parameters from cookies and forms and starts
 * 											GET query to server
 * @constructor 
 * @param {String} context Sets search context for the handler, 
 *  	  				   allowed values are "keywords" and "id"
 */
function InputHandler(context) {
	this.context = context;
	if (this.context == "keywords") {
		this.parameters = {
			'Sites': '',
			'SearchIndex': '',
			'Keywords' : ''	
		};
	} 
	else if (this.context == "id") {
	  this.parameters = {
			'Sites': '',
			'ItemId' : ''
	  };		
	} 
	else {
		throw Exception("InputHandler instance. No parameters.");
	};
};
/**
 * collect_parameters: merges options and search parameters
 * @method
 */
InputHandler.prototype.collect_parameters = function(searchterm) {
	if (this.context == "keywords") {
		this.parameters.Keywords = searchterm;
		this.parameters.SearchIndex = 
			$('#selectable_categories > li.selected').attr('id');
	} else if (this.context == "id") {
		this.parameters.ItemId = searchterm;
	} else {
		throw Exception("InputHandler.collect_parameters(). No query context.");
	}
 	this.parameters.Sites = $('#selectable_stores > li.selected').map(function() {
 		return this.id;}).get().join(',');
 	return this.parameters;
};

/**
 * Return parameters.
 * @method
 */
InputHandler.prototype.get_parameters = function() {
	return this.parameters;
};

/**
 * Return parameters.
 * @constructor
 */
function RequestAgent(context) {
	this.context = context;
}
/**
 * query_server: initiate HTTP request to server
 * @method
 */
RequestAgent.prototype.query_server = function(parameters) {
	$.ajax({
		'data': parameters,
		'success': querySucceeded(this.context),
		'error': queryFailed(this.context)
	});
};

/*
 * Viewer classes. Deal with json response; build tables.
 */
/**
 * Presents response data to browser.
 * @constructor
 */
function Presenter() {
	this.context = new String();
	this.data = new Object();
}

Presenter.prototype.set = function(context, data) {
	this.context = context;
	this.data = data;
}
/**
 * Visualizes the data property of an instance; context-sensitive.
 * @method
 */
Presenter.prototype.view = function(column, order) {
	// represent data as flat array for table builder
	var flat_data = this.flatten(this.data); 
	switch (this.context) {
		case 'keywords':
			var table = this.build_table(this.context, flat_data);
			$('#results > table').replaceWith(table);
			break;
		case 'id':
			var id_sort_fields = { 'Site' : '',
								   'Amazon' : 'local_list_amount',
								   'New' : 'local_new_amount',
								   'Used' : 'local_used_amount'
			}
			var id_col_titles = [];
			for (var key in id_sort_fields) {
				id_col_titles.push(key);
			}
			var id_sort_col = id_col_titles[column] || window.DEFAULT_ID_SORT_COL;
			var id_sort_order = order || window.DEFAULT_ID_SORT_ORDER;
			var sorter = new Sorter();
//			//debug
//			for (var i = 0; i < flat_data.length; i++) {
//				console.log(flat_data[i].site, flat_data[i][id_sort_fields[id_sort_col]]);
//			}	
//			
			sorter.field_sort(flat_data, id_sort_fields[id_sort_col], false);
//			
//			//debug
//			for (var i = 0; i < flat_data.length; i++) {
//				console.log(flat_data[i].site, flat_data[i][id_sort_fields[id_sort_col]]);
//			}	
			
			var result_table = this.build_table(this.context, flat_data, 
					id_col_titles, id_sort_col, id_sort_order);
			$('#results > table').replaceWith(result_table);
			var product_header = this.build_product_header(this.context, this.data);
			$('#results').children().prepend(product_header);
			cb_id_page_init();
			break;
		default: 
			throw Exception('Presenter. No context defined.');
	}
};

Presenter.prototype.build_product_header = function(context, data) {
	for (site in data) { break; }; // get the first key from data
								   // TODO should come from Settings instance -> local
	if (context == 'id') {
		var header = document.createElement('div');
		var table = document.createElement('table');
		header.setAttribute('id', 'product_header');
		table.setAttribute('class', 'product_header');
		var row = document.createElement('tr');
		row = this.add_thumb(row, data[site].image, 150);
		var fields = {'artist': data[site].artist, 
				      'title' : data[site].title,
				      'binding' : data[site].binding};
		row = this.add_infobox(context, row, fields);
		table.appendChild(row);
		}
	return table;
};

Presenter.prototype.build_table_header = function(context, headings, 
		id_sort_col, id_sort_order) {
	if (context == 'id') {
		if (id_sort_order) {
			var order = 'descending';
		} else {
			var order = 'ascending';
		}
		var header = document.createElement('div');
		header.setAttribute('id', 'table_header');
		var row = document.createElement('tr');	
		row.setAttribute('class', 'table_header');
		for (var i = 0; i < headings.length; i++) {
			var cell = document.createElement('td');
			if (headings[i] == id_sort_col) {
				cell.className += 'table_heading sort_header ' + context
				+ ' ' + order;
			} else {
				cell.className += 'table_heading ' + context;
			}
			cell.setAttribute('id', headings[i]);
			cell.innerHTML = headings[i]; //TODO put order symbols here
			row.appendChild(cell);			
		}
	}
	return row;
}
/**
 * @param $context
 * @param $data
 * @return
 */
Presenter.prototype.build_table = function(context, data, id_col_titles, 
		id_sort_col, id_sort_order) {
	var table = document.createElement('table');
	switch (context) {
	case 'keywords':
		table.setAttribute('class', 'keywords');
		for (var i = 0; i < data.length; i++) {
			//console.log('build_table');
			//console.log(data[i]);
			var row = document.createElement('tr');
			row.setAttribute('id', data[i].asin);
			row = this.add_thumb(row, data[i].image, 150);
			var fields = {
					'artist': data[i].artist,
					'title' : data[i].title,
					'binding' : data[i].binding	
			};
			row = this.add_infobox(context, row, fields);
			// register event with call-back for id search context
			$(row).click(table_row_clicked);
			//console.log(row);
			table.appendChild(row);
		}
		break;
	case 'id':
		table.setAttribute('class', 'asin');
		for (var i = 0; i < data.length; i++) {
			var row = document.createElement('tr');
			row.setAttribute('id', data[i].site);
			row = this.add_infobox(context, row, { 'site': data[i].site });
			if (data[i].local_list_amount != 0.00) {
				var list_prices = {
						'local_list_amount' : data[i].local_list_amount,
						'local_list_currency' : data[i].local_currency,		
						'list_amount' : data[i].list_amount,
						'list_currency' : data[i].list_currency						
				};
				row = this.add_infobox(context, row, list_prices);
			} else {
				row = this.add_infobox(context, row);
			}
			if (data[i].local_new_amount != 0.00) {
				var new_prices = {
						'local_new_amount' : data[i].local_new_amount,
						'local_new_currency' : data[i].local_currency,		
						'new_amount' : data[i].new_amount,
						'new_currency' : data[i].new_currency	
				};
				row = this.add_infobox(context, row, new_prices);
			} else {
				row = this.add_infobox(context, row);
			}
			if (data[i].local_used_amount != 0.00) {
				var used_prices = {
						'local_used_amount' : data[i].local_used_amount,
						'local_used_currency' : data[i].local_currency,
						'used_amount' : data[i].used_amount,
						'used_currency' : data[i].used_currency	
				};
				row = this.add_infobox(context, row, used_prices);
			} else {
				row = this.add_infobox(context, row);				
			}
			// register event with call-back for id search context
			$(row).click(shop_clicked(data[i].url));
			table.appendChild(row);
		}
		var headings = this.build_table_header('id', id_col_titles, 
				id_sort_col, id_sort_order);
		table.insertBefore(headings, table.firstChild);
		break;
	default:
		throw Exception('Presenter.build_table(). No context defined.');	
	}
	return table;
}

Presenter.prototype.add_ordericon = function(context, ascending) {
	var img = new Image();
	if (ascending) {
		img.src = '../images/asc_order.png';
	} else {
		img.src = '../images/desc_order.png';
	}
	return img;
}

Presenter.prototype.add_infobox = function(context, row, data) {
	switch (context) { //TODO compact the switch options
		case 'keywords': 
			var cell = document.createElement('td');
			cell.setAttribute('class', 'infobox');
			cell.setAttribute('class', context);
			var list = document.createElement('ul');
			for (var field in data) {
				info_item = document.createElement('li');
				info_item.setAttribute('class', field);
				info_text = document.createTextNode(data[field]);
				info_item.appendChild(info_text);
				list.appendChild(info_item);
			};
			cell.appendChild(list);
			row.appendChild(cell);
			break;
		case 'id':
			var cell = document.createElement('td');
			cell.setAttribute('class', 'infobox');
			cell.setAttribute('class', context);
			if (data) {
				var list = document.createElement('ul');
				for (var field in data) {
					if (data[field]) {
						info_item = document.createElement('li');
						info_item.setAttribute('class', field);
						info_text = document.createTextNode(data[field]);
						info_item.appendChild(info_text);
					}
					list.appendChild(info_item);
				};
				cell.appendChild(list);
			}
			row.appendChild(cell);
			break;
		default:
			throw Exception('Presenter.add_infobox(). No context defined.');
	}
	return row;
};

Presenter.prototype.add_thumb = function(row, image_url, size) {
	var img_field = document.createElement('td');
	img_field.setAttribute('class', 'thumb');
	var img = new Image();
	img.src = image_url;
	img.style.width = String(size) + 'px';
	img_field.appendChild(img);
	row.appendChild(img_field);
	return row;
};
/**
 * Converts a hierarchical json tree into a flat array of objects for sorting.
 */
Presenter.prototype.flatten = function(object) {
	var flat_array = new Array;
	for (var key in object) {
		var elem = object[key];
		if (key.length > 2) {
		// must be asin
			elem['asin'] = key; // save key in new list element
		} else {
			// must be site
			elem['site'] = key;
		};
		flat_array.push(elem);
	};
	return flat_array;
};
/**
 * Sort arrays of json objects.
 * @constructor
 */
function Sorter() {
	this.column = 0;  			// keep track of sort column
	this.order = 'ascending';   // keep track of sort order 
};
/**
 * Defines sort order for field in object.
 */
Sorter.prototype.sort_order = function(field, desc, cast) {
	
   desc = (desc) ? -1 : 1; // descending reverts

   return function(a,b){

       a = a[field];
       b = b[field];

       if (typeof(cast) != 'undefined'){
           a = cast(a);
           b = cast(b);
       }

       if (a<b) return desc * -1;
       if (a>b) return desc * 1;
       return 0;

   };
};

Sorter.prototype.field_sort = function(arr, field, desc) {
	// TODO add string sorting
	if (field == 'local_list_amount' || field == 'local_new_amount' || field == 'local_used_amount') {
		//arr.sort(this.sort_order(field, desc, parseInt));
		arr.sort(this.sort_order(field, desc, parseFloat));
	} else {
//		// case-insensitive
		arr.sort(this.sort_order(field, desc, function(a){return a.toUpperCase();}));
	}
	return arr;
}

/*
 * Utility classes
 */

/**
 * General purpose exception handling.
 * @constructor
 */
function Exception(message) {
	this.message = message;
	this.name = "Exception";
}
/**
 * @method
 */
Exception.prototype.toString = function() {
	return this.name + ": " + this.message;
};

/**
 * @class Settings
 * @constructor
 */
function Settings() {
	this.stores = []; // selected stores to query
	this.local = '';  // local for currency conversion
	this.category = ''; // product categories to search
}
/**
 * @method
 */
Settings.prototype.save = function() {
	this.category = $('#selectable_categories > li.selected').attr('id');
	this.local = $('#selectable_locals > li.selected').attr('id');
	 // TODO ugly, clean up below
	var store_ids = $('#selectable_stores > li.selected').map(function() {
		return $(this).attr('id');
	});
	this.stores = [];
	for (var id in store_ids) {
		if (store_ids[id] == "CA" || store_ids[id] == "DE" || store_ids[id] == "FR" || store_ids[id] == "JP" || 
		store_ids[id] == "UK" || store_ids[id] == "US") {
			this.stores.push(store_ids[id]);
		}
	}

	var cookie_data = { 'category' : String(this.category),
						'local' : String(this.local),
						'stores' : this.stores};
	var cookie = new Cookie; // set cookie with last search preferences
	cookie.store(cookie_data);
}
/**
 * @method
 */
Settings.prototype.get_browser_local = function() {
	var language_code = window.navigator.userLanguage || window.navigator.language;
	if (language_code == 'en-ca') {
		var browser_local = 'CA';
	} else if (language_code == 'de' || language_code == 'de-at' || language_code == 'de-de' ||
			   language_code == 'de-li' || language_code == 'de-lu' || language_code == 'de-ch') {
		var browser_local = 'DE';
	} else if (language_code == 'fr' || language_code == 'fr-be' || language_code == 'fr-fr' ||
			   language_code == 'fr-lu' || language_code == 'fr-mc' || language_code == 'fr-ch') {
		var browser_local = 'FR';
	} else if (language_code == 'ja') {
		var browser_local = 'JP';
	} else if (language_code == 'en-gb' || language_code == 'en-ie') {
		var browser_local = 'UK';
	} else if (language_code == 'en' || language_code == 'en-us') {
		var browser_local = 'US';
	} else { // use default
		var browser_local = window.DEFAULT_LOCAL;
	}
	return browser_local;
}
/**
 * @method
 */
Settings.prototype.set_default = function() {
	this.stores = window.DEFAULT_STORES;
	this.local = this.get_browser_local();
	this.category = window.DEFAULT_CATEGORY;
	this.sync_css(this.stores, this.local, this.category);
}
/**
 * @method
 */
Settings.prototype.sync_css = function(stores, local, category) {
	// we fire the right call-back event
	var category_selector = '#' + category;
	var category_object = $(category_selector);
	cb_selected_categories(category_object);
	
	for (var i = 0; i < stores.length; i++) {
		var store_selector = '#selectable_stores > #' + stores[i];
		var store_object = $(store_selector);
		cb_selected_store(store_object);
	}

	var local_selector = '#selectable_locals > #' + local;
	var local_object = $(local_selector);
	cb_selected_locals(local_object);
}
/**
 * @method
 */
Settings.prototype.restore = function() {
	if (navigator.cookieEnabled == false) {
		this.set_default();		
	} else {
		var cookie = new Cookie();
		var stored_preferences = cookie.read();
		console.log(stored_preferences['stores']);
		this.stores = stored_preferences['stores'] || window.DEFAULT_STORES;
		this.category = stored_preferences['category'] || window.DEFAULT_CATEGORY;
		this.local = stored_preferences['local'] || window.DEFAULT_LOCAL;
		//console.log(this.stores, this.local, this.category);	
		this.sync_css(this.stores, this.local, this.category);
	}	
}
/**
 * @class Cookie
 * @constructor
 */
function Cookie() {
}
Cookie.prototype.LIFETIME = 604800; // stay alive for 1w
/**
 * @method
 */
Cookie.prototype.store = function(data, timeout) {
	for (var key in data) {
		if (data[key] instanceof Array) {
			console.log('store: ' + data[key]);
			var subarray = new Array;
			for (var item in data[key]) {
				subarray.push(data[key][item]);
			}
			var substring = subarray.join();
		} else {
			var substring = data[key];
		}
		substring = key + "=" + encodeURIComponent(substring);
		document.cookie = substring;
	}
	// are we supposed to remove the cookie?
	if (timeout == undefined) {
		timeoutstring = "max-age=" + this.LIFETIME; 
	} else {
		if (timeout == -1) {
	        var date = new Date();
	        date.setTime(date.getTime()-(60*60*1000)); // 1 hour in the past
	        var turn_back = date.toGMTString();
			timeoutstring = "max-age=" + turn_back; 
		} else {
			timeoutstring = "max-age=" + (timeout * 360);		
		}
	}
	document.cookie = timeoutstring;
}

/**
 * @method
 */
Cookie.prototype.read = function() {
	var parsed_data = new Object;
	var cookie_data = document.cookie;
	var arr_data = cookie_data.split(';');
	for (var i = 0; i < arr_data.length; i++) {
		var key_value_pair = arr_data[i].split("=");
		var key = $.trim(key_value_pair[0]);
		var value = decodeURIComponent(key_value_pair[1]);
		if (value.indexOf(",") != -1) {
		// does the value contain the char ","? then build an array
			parsed_data[key] = value.split(',');
		} else {
			parsed_data[key] = value;
		}
	}
	return parsed_data;
}

/**
 * @method
 */
Cookie.prototype.remove = function() {
	var null_data = { 'stores' : "",
			  		  'local' : "",
			          'category' : "" };
	var timeout = -1; // set timeout to false
	this.store(null_data, timeout);
}

/*
 * Test driver
 */
function test_Presenter() {
	console.log('BEGIN testing Presenter.');
	var test_object = {"DE":{"asin":"B000O5AYCA","url":"http:\/\/www.amazon.de\/Boxer-National\/dp\/B000O5AYCA%3FSubscriptionId%3DAKIAJR76TSRZ7NZC3HWA%26tag%3Dcmartel-20%26linkCode%3Dxm2%26camp%3D2025%26creative%3D165953%26creativeASIN%3DB000O5AYCA","image":"http:\/\/ecx.images-amazon.com\/images\/I\/51Lauf6p2aL.jpg","artist":"The National","title":"Boxer","binding":"Audio CD","list_amount":"19.28","list_currency":"EUR","new_amount":"6.20","new_currency":"EUR","used_amount":"6.14","used_currency":"EUR","local_list_amount":"19.28","local_new_amount":"6.20","local_used_amount":"6.14","local_currency":"EUR"},"UK":{"asin":"B000O5AYCA","url":"http:\/\/www.amazon.co.uk\/Boxer-National\/dp\/B000O5AYCA%3FSubscriptionId%3DAKIAJR76TSRZ7NZC3HWA%26tag%3Dcmartel-20%26linkCode%3Dxm2%26camp%3D2025%26creative%3D165953%26creativeASIN%3DB000O5AYCA","image":"http:\/\/ecx.images-amazon.com\/images\/I\/51Lauf6p2aL.jpg","artist":"The National","title":"Boxer","binding":"Audio CD","list_amount":"10.99","list_currency":"GBP","new_amount":"4.99","new_currency":"GBP","used_amount":"4.64","used_currency":"GBP","local_list_amount":"12.91","local_new_amount":"5.86","local_used_amount":"5.45","local_currency":"EUR"}}
	var p = new Presenter();
	var f = p.flatten(test_object);
	console.log('deep');
	console.log(test_object);
	console.log('flattened');
	console.log(f);
	console.log('sorted');
	s = new Sorter();
	var f_sorted = s.field_sort(f, 'local_list_amount', false);
	console.log(f_sorted);
	var f_sorted = s.field_sort(f, 'list_currency', false);
	console.log(f_sorted);
	console.log('END testing Presenter.');
}
//test_Presenter();
function test_Cookie() {
	var stores = ['DE', 'UK', 'CA'];
	var test_data = { 'stores' : stores,
					  'local' : 'US',
					  'category' : 'All' };

	var t_cookie = new Cookie();
	//t_cookie.store(test_data);
	//console.log('store');
	var read_data = t_cookie.read();
	console.log('read');
	console.log(read_data);
	//var r = t_cookie.remove();
	//console.log('remove');
	//console.log(r);
}

//test_Cookie();









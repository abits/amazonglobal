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
});

/*
 * Call-back functions
 */

function cb_searchbtn_clicked() {
	if (($('#searchbar').val() != '') &&                // no vane searches
		($('#searchbar').val() != window.DEFAULT_SEARCHTEXT)) {
		var context = "keywords";
  	var keywords_search = new InputHandler(context);
  	var params = keywords_search.collect_parameters($('#searchbar').val());
  	var query = new RequestAgent(context);
  	query.query_server(params);
  }
}

function cb_configbtn_clicked() {
	
}

function querySucceeded(context) {
	return function(json, status) {
		this.status = status;
		this.json = json;
		var presentation = new Presenter(context, json);
		presentation.view();
	};
};

function queryFailed(context) {
	return function(json, status) {
		this.status = status;
		this.json = json;
		// call Viewer class with context and json
	};
};

function table_row_clicked() {
	console.log('row: ' + $(this).attr('id') + ' clicked');
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
	this.status = new String();
	this.json = new Object();
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
function Presenter(context, data) {
	this.context = context;
	this.data = data; // TODO data needs to be converted to array for sorting!
}
/**
 * Visualizes the data property of an instance; context-sensitive.
 * @method
 */
Presenter.prototype.view = function() {
	console.log('view:');
	console.log(this.data);
	// represent data as flat array for table builder
	var flat_data = this.flatten(this.data); 
	// default sort by list price ascending
	var sorter = new Sorter();
	sorter.field_sort(flat_data, 'local_list_amount', false);
	switch (this.context) {
		case 'keywords':
			var table = this.build_table(this.context, flat_data);
			$('#results > table').replaceWith(table);
			break;
		case 'id':
			var result_table = this.build_table(this.context, flat_data);
			$('#results > table').replaceWith(result_table);
			var product_header = this.build_product_header(this.context, this.data);
			$('#results').children().prepend(product_header);
			break;
		default: 
			throw Exception('Presenter. No context defined.');
	}
};

Presenter.prototype.build_product_header = function(context, data) {
	for (site in data) { break; }; // get the first key from data
																 // TODO should come from Settings instance
	if (context == 'id') {
		var header = document.createElement('div');
		var table = document.createElement('table');
		header.setAttribute('id', 'product_header');
		table.setAttribute('class', 'product_header');
		var row = document.createElement('tr');
		row = this.add_thumb(row, data[site].image, 150);
		var fields = {
				'artist': data[site].artist, 
				'title' : data[site].title,
				'binding' : data[site].binding	};
			row = this.add_infobox(context, row, fields);
			table.appendChild(row);
		}
	return table;
};
/**
 * @param $context
 * @param $data
 * @return
 */
Presenter.prototype.build_table = function(context, data) {
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
			var list_prices = {
					'local_list_amount' : data[i].local_list_amount,
					'local_list_currency' : data[i].local_currency,		
					'list_amount' : data[i].list_amount,
					'list_currency' : data[i].list_currency						
			};
			row = this.add_infobox(context, row, list_prices);
			var new_prices = {
					'local_new_amount' : data[i].local_new_amount,
					'local_new_currency' : data[i].local_currency,		
					'new_amount' : data[i].new_amount,
					'new_currency' : data[i].new_currency	
			};
			row = this.add_infobox(context, row, new_prices);
			var used_prices = {
					'local_used_amount' : data[i].local_used_amount,
					'local_used_currency' : data[i].local_currency,
					'used_amount' : data[i].used_amount,
					'used_currency' : data[i].used_currency	
			};
			row = this.add_infobox(context, row, used_prices);
			// register event with call-back for id search context
			$(row).click(shop_clicked(data[i].url));
			table.appendChild(row);
		}		
		break;
	default:
		throw Exception('Presenter.build_table(). No context defined.');	
	}
	return table;
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
	if (field == 'local_list_amount' || field == 'local_new_aount' || field == 'local_used_amount') {
		arr.sort(this.sort_order(field, desc, parseInt));
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
	
}

/**
 * @class OptionsHandler
 * @constructor
 */
function OptionsHandler() {
	
}

/**
 * @class Cookie
 * @constructor
 */
function Cookie() {
	
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
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
			$('#searchbtn').click();
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
	this.data = data;
}
/**
 * Visualizes the data property of an instance; context-sensitive.
 * @method
 */
Presenter.prototype.view = function() {
	console.log(this.data);
	switch (this.context) {
		case 'keywords':
			var table = this.build_table(this.context, this.data);
			$('#results > p').replaceWith(table);
			break;
		case 'id':
			var result_table = this.build_table(this.context, this.data);
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
			for (var product in data) {
					var row = document.createElement('tr');
					row.setAttribute('id', data[product].asin);
					row = this.add_thumb(row, data[product].image, 150);
					var fields = {
							'artist': data[product].artist,
							'title' : data[product].title,
							'binding' : data[product].binding	
					};
					row = this.add_infobox(context, row, fields);
					// register event with call-back for id search context
					$(row).click(table_row_clicked);
					table.appendChild(row);
			}
			break;
		case 'id':
			table.setAttribute('class', 'asin');
			for (var site in data) {
				var row = document.createElement('tr');
				row.setAttribute('id', site);
				row = this.add_infobox(context, row, { 'site': site });
				var list_prices = {
						'list_amount' : data[site].list_amount,
						'list_currency' : data[site].list_currency						
				};
				row = this.add_infobox(context, row, list_prices);
				var new_prices = {
						'new_amount' : data[site].new_amount,
						'new_currency' : data[site].new_currency	
				};
				row = this.add_infobox(context, row, new_prices);
				var used_prices = {
						'used_amount' : data[site].used_amount,
						'used_currency' : data[site].used_currency	
				};
				row = this.add_infobox(context, row, used_prices);
				// register event with call-back for id search context
				$(row).click(shop_clicked(data[site].url));
				table.appendChild(row);
		}
			break;
		default:
			throw Exception('Presenter.build_table(). No context defined.');
	};
	return table;
};

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
	if (img.width > size) {
		img.style.width = String(size) + 'px';
	}
	img_field.appendChild(img);
	row.appendChild(img_field);
	return row;
};
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

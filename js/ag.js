/** AmazonGlobal - compare prices of Amazon international stores.
 * ag.js: local backend/frontend of AmazonGlobal package.  Handles user input,
 * parses and collects server response data.  Makes collected data 
 * available for local browser presentation.
 * @author Chris <accidentalbits@googlemail.com> 
 * @version 0.1
 */

/**
 * @classDescription Queries AWS proxy for product data.
 * @constructor
 */
function InputHandler() {
	console.log('input handler instantiated.');
	this.context = "newsearch";
	this.sites = [];
	this.keywords = "";
	this.asin = "";
	this.searchIndex = "All"; // FIXME, need selectable drop-down
}

InputHandler.prototype.getUserInput = function(context) {
	// return dict
	var input = {};
	switch (context) {
		case 'keywords':
			input = {
				'searchIndex': this.searchIndex,
				'keywords': this.keywords,
				'sites': this.sites
			};
			break;
		case 'asin':
			input = {
				'asin': this.asin,
				'sites': this.sites
			};
			break;
	}	
	return input;
};

InputHandler.prototype.handleKeywordsChoice = function(context, userInput) {
	//console.log(context, userInput);
	if (context == 'keywords') {
		// don't search for the default value!
		if (!$('#ipt_keywords').hasClass('default')) {
			this.keywords = userInput;
			// check if we got a flag choice, else go with default
			if (this.sites.length == 0) {
				this.handleFlagChoice($('#DE'), context); // FIXME, Germany is default
			}
			var input = this.getUserInput(context);
			var rH = new RequestHandler()
			rH.initRequest(input);
			rH.queryServer();
		}
	}
}



InputHandler.prototype.handleFlagChoice = function(flag, context){
	if (context == 'keywords') {
		// only one flag is allowed; so unset all first and clear array
		InputHandler.unsetFlags();
		InputHandler.toggleFlag(flag);
		this.sites = [];
		this.sites.push($(flag).attr('id'));
	} else if (context == 'keywords') {
		// multiple choices are allowed, 
		// test if we already registered this choice
		if ($.inArray($(flag).attr('id'), this.sites) > -1) {
			// we already have it, so remove it and toggle flag
			this.sites = $.grep(this.sites, function(v){
				return v != $(flag).attr('id');
			})
		} else {
			// else add it
			this.sites.push($(flag).attr('id'));
		}
		// then toggle flag
		InputHandler.toggleFlag(flag);
		console.log(this.getUserInput(context));
	}
}

InputHandler.unsetFlags = function() {
	$('#flags img').css('-moz-box-shadow', '2px 2px 2px #888');
}

InputHandler.toggleFlag = function(flag) {
	if (flag.css('-moz-box-shadow') == 'rgb(136, 136, 136) 0px 0px 0px 0px') {
		flag.css('-moz-box-shadow', '2px 2px 2px #888');
	} else {
		flag.css('-moz-box-shadow', '0px 0px 0px #888');
	}
}
//===========================================================================//
/**
 * @classDescription Queries AWS proxy for product data.
 * @constructor
 */
function RequestHandler() {
	// instance properties
	this.context = '';
	this.data = []; // collects server responses
	this.requestId = -1;
	this.parameters = {}; //parameters to query
	this.sites = []; //list of sites to query
}

// class properties
/**
* This is a property of class RequestHandler
*
* @property {String} PROXY_CA url of local (php) proxy for crossdomain requests
* @property {String} PROXY_DE url of local (php) proxy for crossdomain requests
* @property {String} PROXY_FR url of local (php) proxy for crossdomain requests
* @property {String} PROXY_JP url of local (php) proxy for crossdomain requests
* @property {String} PROXY_UK url of local (php) proxy for crossdomain requests
* @property {String} PROXY_US url of local (php) proxy for crossdomain requests
*/
RequestHandler.PROXY_CA = "http://127.0.0.1:8000/AmazonGlobal/php/aws_ca_proxy.php";
RequestHandler.PROXY_DE = "http://127.0.0.1:8000/AmazonGlobal/php/aws_de_proxy.php";
RequestHandler.PROXY_FR = "http://127.0.0.1:8000/AmazonGlobal/php/aws_fr_proxy.php";
RequestHandler.PROXY_JP = "http://127.0.0.1:8000/AmazonGlobal/php/aws_jp_proxy.php";
RequestHandler.PROXY_UK = "http://127.0.0.1:8000/AmazonGlobal/php/aws_uk_proxy.php";
RequestHandler.PROXY_US = "http://127.0.0.1:8000/AmazonGlobal/php/aws_us_proxy.php";

RequestHandler.COLL = new Collector();

// class methods
/**
 * This is a class method of class RequestHandler.
 * 
 * @method Returns proxy url per site shortcut.
 * @param {Object} site shortcut for site being queried: 'CA', 'DE', 'FR', 
 * 'JP', 'US', 'UK'
 */
RequestHandler.setHost = function(site){
	switch (site) {
		case 'CA':
			return RequestHandler.PROXY_CA;
			break;
		case 'DE':
			return RequestHandler.PROXY_DE;
			break;
		case 'FR':
			return RequestHandler.PROXY_FR;
			break;
		case 'JP':
			return RequestHandler.PROXY_JP;
			break;
		case 'UK':
			return RequestHandler.PROXY_UK;
			break;
		case 'US':
			return RequestHandler.PROXY_US;
	}
}
/* 
 * ajax callbacks, contain main process logic
 */
/**
 * This is a class method of class RequestHandler.
 * 
 * @method Callback when ajax query succeeded: parse, store and present data.
 * @param {Object} context which type of search 'keywords' or 'asin'
 * @param {Object} site which site to query: 'CA', 'DE', 'FR', 'JP', 'UK', 'US'
 */
RequestHandler.ajaxSucceeded = function(context, site) {
	return function(xml, statusText) {
		var pars = new Parser(context, site);
		response = pars.parse(xml);
		RequestHandler.COLL.store(response, response.context);
	}
};
/**
 * This is a class method of class RequestHandler
 * 
 * @method logging ajax failures
 * @param {Object} context which type of search 'keywords' or 'asin'
 * @param {Object} site which site to query: 'CA', 'DE', 'FR', 'JP', 'UK', 'US'
 */	
RequestHandler.ajaxFailed = function(context, site) {
	return function(xhr, status, error) {
		if (context == 'keywords') {
			console.log("error");
			$('#busy').css('display', 'none');
			$('#output').remove('#busy');
			var message = document.createElement('div');
			var text = document.createTextNode('Oops.  Connection failed.  Try again.');
			message.appendChild(text);
			message.setAttribute('id', 'networkErrorMessage');
			$('#output').append(message);
		}
		if (context == 'asin') {
			console.log('asin lookup failed');
		}
	}
};

// instance methods
/**
 * This is an instance method of class RequestHandler.
 * 
 * @method Initializes request parameters from user input, sets context.
 * @param {object} user input dictionary of asin/keyword, searchindex and sites
 */
RequestHandler.prototype.initRequest = function(input) {
	this.sites = input['sites'];
	this.parameters = {}; // reset the field
	// determine and set context
	if (input.hasOwnProperty('asin')) {
		this.context = 'asin';
		this.parameters = {
			'Operation': 'ItemLookup',
			'ItemId': input['asin'],
			'ResponseGroup': 'Medium,ItemAttributes,OfferFull',
			}
	} else if (input.hasOwnProperty('keywords')) {
		this.context = 'keywords';
		this.parameters = {
			'Operation': 'ItemSearch',
			'SearchIndex': input['searchIndex'],
			'Keywords': input['keywords'],
			'ResponseGroup': 'Medium,ItemAttributes,OfferFull',
			}
	} else {
		this.context = '';
		throw 'RequestHandler.prototype.initRequest: ' +
		'illegal user input (missing asin/keywords)';
	}
}

/**
 * This is an instance method of class RequestHandler.
 * 
 * @method Queries proxy with request parameters for each entry in request list.
 */
RequestHandler.prototype.queryServer = function() {
	//determine proxy target
	if (this.context == 'keywords' && this.sites.length == 1) {
		RequestHandler.COLL.toggleBusy('#output table', true);
		jQuery.ajax({
			type: 'GET',
			//timeout: 5000,
			url: RequestHandler.setHost(this.sites[0]),
			dataType: 'xml',
			data: this.parameters,
			success: RequestHandler.ajaxSucceeded(this.context, this.sites[0]),
			error: RequestHandler.ajaxFailed(this.context, this.sites[0]),
		});
	}
	if (this.context == 'asin') {
		for (var j = 0; j < this.sites.length; j++) {
			RequestHandler.COLL.toggleBusy('#output table', true);
			jQuery.ajax({
				type: 'GET',
				//timeout: 5000,
				url: RequestHandler.setHost(this.sites[j]),
				dataType: 'xml',
				data: this.parameters,
				success: RequestHandler.ajaxSucceeded(this.context, this.sites[j]),
				error: RequestHandler.ajaxFailed(this.context, this.sites[j])
			})	
		}
	}
}

//===========================================================================//
/**
 * @classDescription Parses server data.
 * @constructor
 */
function Parser(context, site) {
	this.site = site;
	this.context = context;
}
/**
 * This is an instance method of class Parser.
 * 
 * @method Converts xml data to json style object.
 * @param {Object} xml data from AWS server
 * @return {Object} json object holding site, context and results field; the results
 * field yields keys: asin, binding, artist, title, thumbnail, site, amount, 
 * currency, and link 
 */
Parser.prototype.parse = function(xml, context) {
	var results = [];
	function filter(site) {
		return function() {
			var item = {
				'asin' : '',
				'binding' : '',
				'artist' : '',
				'title' : '',
				'thumbnail' : '',
				'site' : '',
				'amount' : '',
				'currency' : '',
				'link' : ''
			}
			item.asin = $(this).find('ASIN').text();
			item.binding = $(this).find('Binding').text();
			art = $(this).find('Artist').text() || $(this).find('Author').text() || $(this).find('Director').text();
			item.artist = art.toTitleCase();
			tit = $(this).find('Title').text();
			item.title = tit.toTitleCase();
			item.thumbnail = $(this).find('ThumbnailImage:first').find('URL:first').text();
			item.site = site;
			item.amount = $(this).find('Price').find('Amount').text() || $(this).find('LowestNewPrice').find('Amount').text() || $(this).find('LowestUsedPrice').find('Amount').text();
			item.currency = $(this).find('Price').find('CurrencyCode').text() || $(this).find('LowestNewPrice').find('CurrencyCode').text() || $(this).find('LowestUsedPrice').find('CurrencyCode').text();
			item.link = $(this).find('DetailPageURL').text();
			results.push(item);			
		}
	}
	if (this.context == 'asin') {
		$(xml).find('Item').each(filter(this.site));
		var parsed = { 'site' : this.site,
			           'context' : this.context,
			           'results' : results[0] }; // for asin searches, don't return list!
	} else if (this.context == 'keywords') {
		$(xml).find('Item').each(filter(this.site));
		var parsed = { 'site' : this.site,
			           'context' : this.context,
			           'results' : results };
	}

	//console.log('parsed: ');
	//console.log(parsed);
	return parsed;
}

//===========================================================================//
/**
 * @classDescription Collects data from server queries for table visualization.
 * @constructor
 */
function Collector() {
	this.storage = {};
	// diversify to avoid resource conflicts in race condition
	this.kw_result = {};
	this.asCA_result = {};
	this.asDE_result = {};
	this.asFR_result = {};
	this.asJP_result = {};
	this.asUK_result = {};
	this.asUS_result = {};
	}


Collector.restoreKeywordSearch = function() {
	var coll = new Collector();
	coll.present('keywords');  
}

Collector.ascendingBinding = function(a,b) {
	return ((a.binding == b.binding) ? 0 : ((a.binding > b.binding) ? 1 : -1 ));
}

Collector.descendingPrice = function(a, b){
	if (a.hasOwnProperty('localAmount') && b.hasOwnProperty('localAmount')) {
		return parseFloat(a.localAmount) - parseFloat(b.localAmount);
	} else if (a.hasOwnProperty('localAmount')) {
		return -1;
	} else if (b.hasOwnProperty('localAmount')) {
		return 1;
	} else {
		return 0;
	}
}

Collector.buildTable = function(context, site, storage){	
	if (context == 'keywords') {
		var rows = [];
		$(storage).each(function(index, item) {
			var row = document.createElement('tr');
			row.setAttribute("asin", item['asin']);
			var img_field = document.createElement('td');
			img_field.setAttribute('asin', item['asin']);
			img_field.setAttribute('class', 'thumb');
			var img = new Image();
			img.src = item['thumbnail'];
			img_field.appendChild(img);
			row.appendChild(img_field);

			var info_field = document.createElement('td');
			info_field.setAttribute('asin', item['asin']);
			info_field.setAttribute('class', 'info');
			var binding = document.createTextNode(item['binding']);
			var artist = document.createTextNode(item['artist']);
			var title = document.createTextNode(item['title']);
			info_field.appendChild(binding);
			info_field.appendChild(document.createElement('br'));
			info_field.appendChild(artist);
			info_field.appendChild(document.createElement('br'));
			info_field.appendChild(title);
			row.appendChild(info_field);
			rows.push(row);
		});
		var table = document.createElement('table');
		table.setAttribute("context", 'keywords');
		$(rows).each(function(index, item) {
			table.appendChild(item);
		});
		$('#output').html(table);
		//console.log(table);
		}
	if (context == 'asin') {
		//console.log(storage);
		var rows = [];
		$(storage).each(function(index, item) {
			var row = document.createElement('tr');
			row.setAttribute("asin", item['asin']);
			var img_field = document.createElement('td');
			img_field.setAttribute('asin', item['asin']);
			img_field.setAttribute('class', 'thumb');
			var img = new Image();
			img.src = item['thumbnail'];
			img_field.appendChild(img);
			row.appendChild(img_field);

			var info_field = document.createElement('td');
			info_field.setAttribute('asin', item['asin']);
			info_field.setAttribute('class', 'info');
			var binding = document.createTextNode(item['binding']);
			var artist = document.createTextNode(item['artist']);
			var title = document.createTextNode(item['title']);
			info_field.appendChild(binding);
			info_field.appendChild(document.createElement('br'));
			info_field.appendChild(artist);
			info_field.appendChild(document.createElement('br'));
			info_field.appendChild(title);
			row.appendChild(info_field);
			
			var offer_field = document.createElement('td');
			offer_field.setAttribute('asin', item['asin']);
			offer_field.setAttribute('class', 'offer');
			var currencyParameters = CurrencyConverter.setCurrencyCode(site);
			var amountMult = item['amount'] * currencyParameters.mult;
			amountMult = CurrencyConverter.rount(amountMult);
			var amount = document.createTextNode(amountMult + ' ' + item['currency']);
			offer_field.appendChild(amount);
			if (item['currency'] != currencyParameters.fromCurrency && item['localAmount'] != undefined) {
				offer_field.appendChild(document.createElement('br'));
				var localAmount = document.createTextNode(item['localAmount'] +
				' ' + currencyParameters.fromCurrency);
				offer_field.appendChild(localAmount);
			}
			offer_field.appendChild(document.createElement('br'));
			var offerLink = document.createElement('a');
			offerLink.setAttribute("href", item['link']);
			offerLink.setAttribute("target", "_blank");
			var offerSite = document.createTextNode(item['site']);
			offerLink.appendChild(offerSite);
			offer_field.appendChild(offerLink);
			row.appendChild(offer_field);
			
			rows.push(row);
		});
	//console.log(rows);
	var asin_table = document.createElement('table');
	asin_table.setAttribute("context", 'asin');
	$(rows).each(function(index, item) {
		asin_table.appendChild(item);
	});
	$('#output').html(asin_table);
	//console.log(asin_table);
	}
};


Collector.readStorage = function(context) {
	if (context == 'keywords') {
		var store = [];
		$('.store_item_kw').each(function(index, item) {
			store.push(JSON.parse($(this).html()));	
		})
	}
	if (context == 'asin') {
		var store = [];
		$('.store_item_asin').each(function(index, item) {
			//console.log($(this).html());
			if ($(this).html()) {
				store.push(JSON.parse($(this).html()));
			}
		})
	}
	if (context == 'CA') {
		var store = [];
		$('#storage_ca').each(function(index, item) {
			store.push(JSON.parse($(this).html()));	
		})
	}
	if (context == 'DE') {
		var store = [];
		$('#storage_de').each(function(index, item) {
			store.push(JSON.parse($(this).html()));	
		})
	}
	if (context == 'FR') {
		var store = [];
		$('#storage_fr').each(function(index, item) {
			store.push(JSON.parse($(this).html()));	
		})
	}
	if (context == 'JP') {
		var store = [];
		$('#storage_jp').each(function(index, item) {
			store.push(JSON.parse($(this).html()));	
		})
	}
	if (context == 'UK') {
		var store = [];
		$('#storage_uk').each(function(index, item) {
			store.push(JSON.parse($(this).html()));	
		})
	}
	if (context == 'US') {
		var store = [];
		$('#storage_us').each(function(index, item) {
			store.push(JSON.parse($(this).html()));	
		})
	}
	return store;
}

/**
 * This is an instance method of class Collector.
 * 
 * @method Presents json result objects as table elements and adds them to page.
 * @return {Object} table elements
 */
Collector.prototype.present = function(context) { 
// we really want this when e'thing's loaded...
	if (!context) {
		context = $('#storage').attr('class');
	}
	if (context == 'keywords') {
		var kw_storage = Collector.readStorage('keywords');
		var kw_storage_sorted = kw_storage.sort(Collector.ascendingBinding);
		Collector.buildTable(context, kw_storage[0].site, kw_storage);
		$('tr[asin]').click(function() {
			var input = {
				'asin': $(this).attr('asin'),
				'sites': ['DE', 'UK', 'US', 'CA', 'JP', 'FR']
				};
				//console.log($(this));	
				var rH = new RequestHandler();
				rH.initRequest(input);
	//			console.log('\t-> Testing method initRequest with testInput: \n' 
	//						+ '\t\t=> ' + toString(input));
	//			console.log(toString(test_rH.requests));
				rH.queryServer();				
			});
	}
	if (context == 'asin') {
		//console.log('present asin search');
		var kw_storage = Collector.readStorage('keywords');
		var asin_storage = Collector.readStorage('asin');
		//console.log(asin_storage);
		var asin_storage_sorted = asin_storage.sort(Collector.descendingPrice);
		Collector.buildTable(context, kw_storage[0].site, asin_storage);
	}
};

/**
 * @method Stores site specific json objects of results in hidden div container.
 * @param {Object} result json of server responses as delivered by Parser instance
 */
Collector.prototype.store = function(result, context){
	if (context == 'keywords') {
		$('#storage').toggleClass('keywords', true);
		$('#storage').toggleClass('asin', false);
		var items = result.results;
		$(items).each(function(ind, it){
			$('#storage_kw').append('<div class="store_item_kw">' + JSON.stringify(it) + '</div>');
		});
	}
	if (context == 'asin') {
		var converter = new CurrencyConverter();
		var kw_storage = Collector.readStorage('keywords');
		var to = kw_storage[0].currency;
		$('#storage').toggleClass('keywords', false);
		$('#storage').toggleClass('asin', true);
		switch (result.site) {
			case 'CA':
				//console.log(result.results);
				$('#storage_ca').html(JSON.stringify(result.results));
				converter.convert(result.results.amount, 'CA', to);
				break;
			case 'DE':
				$('#storage_de').html(JSON.stringify(result.results));
				converter.convert(result.results.amount, 'DE', to);
				break;
			case 'FR':
				$('#storage_fr').html(JSON.stringify(result.results));
				converter.convert(result.results.amount, 'FR', to);
				break;
			case 'JP':
				$('#storage_jp').html(JSON.stringify(result.results));
				converter.convert(result.results.amount, 'JP', to);
				break;
			case 'UK':
				$('#storage_uk').html(JSON.stringify(result.results));
				converter.convert(result.results.amount, 'UK', to);
				break;
			case 'US':
				$('#storage_us').html(JSON.stringify(result.results));
				converter.convert(result.results.amount, 'US', to);
		}
	}
}

Collector.prototype.toggleBusy = function(elementSelector, state) {
	if (state == true) {
		$(elementSelector).fadeOut('slow');
		$('#output table').slideUp('fast');
		if ($('#output').children('#busy').length == 0) {
			var busy = new Image();
			busy.setAttribute('id', 'busy');
			busy.src = '../res/ajax-loader.gif';
			document.getElementById("output").appendChild(busy);
		}
	} else if (state == false) {
		$('#busy').css('display', 'none');
		$('#output').remove('#busy');
		$(elementSelector).fadeIn('slow');
		$('#output table').slideDown('fast');
	}
}

/*
 * JavaScript port of John Gruber's TitleCase Perl script:
 * http://daringfireball.net/projects/titlecase/TitleCase.pl
 *
 * This filter changes all words to Title Caps, and attempts to be clever
 * about *un*capitalizing small words like a/an/the in the input.
 *
 * The list of "small words" which are not capped comes from
 * the New York Times Manual of Style, plus 'vs' and 'v'.
 *
 * License: http://www.opensource.org/licenses/mit-license.php
 *
 * David Lindquist (http://www.stringify.com/)
 * 21 May 2008
 */

String.prototype.toTitleCase = function() {
    var small_words = 'a an and as at but by en for if in of on or the to v[.]? via vs[.]?'.split(/\s/);
    var punct = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
    var small_re = small_words.join('|');

    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.substring(1);
    }

    var general_repl = [
        [/\b([A-Za-z][a-z.\']*)\b/g,
         function(str, word) {
             if (/[A-Za-z][.][A-Za-z]/.test(word))
                 return word;
             return capitalize(word);
         }
        ],
        [new RegExp('\\b(' + small_re + ')\\b', 'ig'),
         function(str, small) { return small.toLowerCase(); }
        ],
        [new RegExp('^([' + punct + ']*)(' + small_re + ')\\b', 'ig'),
         function(str, punct, small) { return punct + capitalize(small); }
        ],
        [new RegExp('\\b(' + small_re + ')([' + punct + ']*)$', 'ig'),
         function(str, small, punct) { return capitalize(small) + punct; }
        ]
    ];

    var special_repl = [
        [/ V(s?)\. /g,
         function(str, s) { return ' v' + s + '. '; }
        ],
        [/([\'\u2019])S\b/g,
         function(str, apos) { return apos + 's' }
        ],
        [/\b(AT&T|Q&A)\b/ig,
         function(str, s) { return s.toUpperCase(); }
        ]
    ];

    var split_re = /([:.;?!][ ]|(?:[ ]|^)[\"\u201c])/g;
    var tokens_in = []
    var tokens_out = [];
    var token, regex, repl, idx = 0, m;

    while ((m = split_re.exec(this)) != null) {
        tokens_in.push(this.substring(idx, m.index), m[1]);
        idx = split_re.lastIndex;
    }
    tokens_in.push(this.substring(idx));

    for (var i = 0; i < tokens_in.length; i++) {
        token = tokens_in[i];
        for (var j = 0; j < general_repl.length; j++) {
            regex = general_repl[j][0];
            repl  = general_repl[j][1];
            token = token.replace(regex, repl);
        }
        tokens_out.push(token);
    }
    var title = tokens_out.join('');
    for (var k = 0; k < special_repl.length; k++) {
        regex = special_repl[k][0];
        repl  = special_repl[k][1];
        title = title.replace(regex, repl);
    }

    return title;
}


//===========================================================================//
function CurrencyConverter() {
}

CurrencyConverter.rount = function(x) {
	var k = (Math.round(x * 100) / 100).toString();
	k += (k.indexOf('.') == -1)? '.00' : '00';
	return k.substring(0, k.indexOf('.') + 3);
}


CurrencyConverter.setCurrencyCode = function(from) {
	var fromCurrency = ''
	var mult = 1;
	switch (from) {
		case "CA":
			fromCurrency = 'CAD';
			mult = 0.01;
			break;
		case "DE":
			fromCurrency = 'EUR';
			mult = 0.01;
			break;
		case "FR":
			fromCurrency = 'EUR';
			mult = 0.01;
			break;
		case "JP":
			fromCurrency = 'JPY';
			mult = 1;
			break;
		case "UK":
			fromCurrency = 'GBP';
			mult = 0.01;
			break;
		case "US":
			fromCurrency = 'USD';
			mult = 0.01;
			break;
		default:
			fromCurrency = '';
			mult = 1;
		}
	return {'fromCurrency' : fromCurrency,
			 'mult' : mult
			 };
}

CurrencyConverter.setHost = function(site){
	switch (site) {
		case 'CA':
			return 'http://127.0.0.1:8000/AmazonGlobal/php/conv_ca_proxy.php';
			break;
		case 'DE':
			return 'http://127.0.0.1:8000/AmazonGlobal/php/conv_de_proxy.php';
			break;
		case 'FR':
			return 'http://127.0.0.1:8000/AmazonGlobal/php/conv_fr_proxy.php';
			break;
		case 'JP':
			return 'http://127.0.0.1:8000/AmazonGlobal/php/conv_jp_proxy.php';
			break;
		case 'UK':
			return 'http://127.0.0.1:8000/AmazonGlobal/php/conv_uk_proxy.php';
			break;
		case 'US':
			return 'http://127.0.0.1:8000/AmazonGlobal/php/conv_us_proxy.php';
	}
}

CurrencyConverter.ajaxSucceeded = function(site){
	return function(data, statusText){
		if (data != null) {
		switch (site) {
			case 'CA':
				var localAmount = CurrencyConverter.rount(parseFloat(data.rhs));
				var store = Collector.readStorage('CA');
				var item = store[0];
				item['localAmount'] = localAmount;
				$('#storage_ca').html(JSON.stringify(item));
				break;
			case 'DE':
				var localAmount = CurrencyConverter.rount(parseFloat(data.rhs));
				var store = Collector.readStorage('DE');
				var item = store[0];
				item['localAmount'] = localAmount;
				$('#storage_de').html(JSON.stringify(item));
				break;
			case 'FR':
				var localAmount = CurrencyConverter.rount(parseFloat(data.rhs));
				var store = Collector.readStorage('FR');
				var item = store[0];
				item['localAmount'] = localAmount;
				$('#storage_fr').html(JSON.stringify(item));
				break;
			case 'JP':
				var localAmount = CurrencyConverter.rount(parseFloat(data.rhs));
				var store = Collector.readStorage('JP');
				var item = store[0];
				item['localAmount'] = localAmount;
				$('#storage_jp').html(JSON.stringify(item));
				break;
			case 'UK':
				var localAmount = CurrencyConverter.rount(parseFloat(data.rhs));
				var store = Collector.readStorage('UK');
				var item = store[0];
				item['localAmount'] = localAmount;
				$('#storage_uk').html(JSON.stringify(item));
				break;
			case 'US':
				var localAmount = CurrencyConverter.rount(parseFloat(data.rhs));
				var store = Collector.readStorage('US');
				var item = store[0];
				item['localAmount'] = localAmount;
				$('#storage_us').html(JSON.stringify(item));
				break;
		}		
		}
	}
}
	
CurrencyConverter.prototype.queryServer = function(parameters, site){
	jQuery.ajax({
		type: 'GET',
		url: CurrencyConverter.setHost(site),
		dataType: 'json',
		data: parameters,
		success: CurrencyConverter.ajaxSucceeded(site),
		error: function(xhr, status, error){
			console.log('ajax error: ' + status + ' ' + error)
		},
	});
}
	
CurrencyConverter.prototype.convert = function(amount, from, to){
	var currencyParameter = CurrencyConverter.setCurrencyCode(from);
	var fromCurrency = currencyParameter.fromCurrency;
	var mult = currencyParameter.mult;
	var queryString = (amount * mult) + fromCurrency + '=?' + to;
	var parameters = {
		'q': queryString
	};
	this.queryServer(parameters, from);
}


//===========================================================================//
if (!this.JSON) {
    this.JSON = {};
}

(function () {

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                   this.getUTCFullYear()   + '-' +
                 f(this.getUTCMonth() + 1) + '-' +
                 f(this.getUTCDate())      + 'T' +
                 f(this.getUTCHours())     + ':' +
                 f(this.getUTCMinutes())   + ':' +
                 f(this.getUTCSeconds())   + 'Z' : null;
        };

        String.prototype.toJSON =
        Number.prototype.toJSON =
        Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' :
                    gap ? '[\n' + gap +
                            partial.join(',\n' + gap) + '\n' +
                                mind + ']' :
                          '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' :
                gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                        mind + '}' : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                     typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
.replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());
/** AmazonGlobal - compare prices of Amazon international stores.
 * ag.js: local backend of AmazonGlobal package.  Handles user input,
 * parses and collects server response data.  Makes collected data 
 * available for local frontend.
 * @author Chris <accidentalbits@googlemail.com> 
 * @version 0.1
 */


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
	var coll = new Collector(context, site);
	return function(xml, statusText) {
		var pars = new Parser(context, site);
		response = pars.parse(xml);
		console.log(coll.store(response));
		coll.present(context, site, response);
		console.log('ajax succeded: ' + context + ' ' + site);
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
		console.log('ajax failed: ' + context + ' ' + site);
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
		jQuery.ajax({
			type: 'GET',
			url: RequestHandler.setHost(this.sites[0]),
			dataType: 'xml',
			data: this.parameters,
			success: RequestHandler.ajaxSucceeded(this.context, this.sites[0]),
			error: RequestHandler.ajaxFailed(this.context, this.sites[0]),
		});
	}
	if (this.context == 'asin') {
		for (var j = 0; j < this.sites.length; j++) {
			jQuery.ajax({
				type: 'GET',
				url: RequestHandler.setHost(this.sites[j]),
				dataType: 'xml',
				data: this.parameters,
				success: RequestHandler.ajaxSucceeded(this.context, this.sites[j]),
				error: RequestHandler.ajaxFailed(this.context, this.sites[j])
			})	
		}
	}
}


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
Parser.prototype.parse = function(xml) {
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
			item.amount = $(this).find('ListPrice').find('Amount').text();
			item.currency = $(this).find('ListPrice').find('CurrencyCode').text();
			item.link = $(this).find('DetailPageURL').text();
			results.push(item);			
		}
	}
	$(xml).find('Item').each(filter(this.site));
	return { 'site' : this.site,
		     'context' : this.context,
		     'results' : results }
}


/**
 * @classDescription Collects data from server queries for table visualization.
 * @constructor
 */
function Collector(type, site) {
	this.site = site;
	this.context = type;
	this.container = {};
	this.collection = [];
}

Collector.buildInfoNodes = function(context, site, results) {
	var infoNodes = [];
	function build(index, item) {	
		console.log(item);
		var fields = []
		if (context == "keywords") {
			var img_field = document.createElement('td');
			img_field.setAttribute('asin', item['asin']);
			img_field.setAttribute('class', 'thumb');
			var img = new Image();
			img.src = item['thumbnail'];
			img_field.appendChild(img);
			fields.push(img_field);
			
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
			fields.push(info_field);	
			
			var sidebar_field = document.createElement('td');
			sidebar_field.setAttribute('asin', item['asin']);
			sidebar_field.setAttribute('class', 'sidebar');
			var asin = document.createTextNode(item['asin']);
			var amount = document.createTextNode(item['amount']);
			var title = document.createTextNode(item['title']);
			sidebar_field.appendChild(asin);
			sidebar_field.appendChild(document.createElement('br'));
			sidebar_field.appendChild(amount);
			fields.push(sidebar_field);	

			infoNodes.push(fields);
		}
		if (context == "asin") {
			var img_field = document.createElement('td');
			img_field.setAttribute('asin', item['asin']);
			img_field.setAttribute('class', 'thumb');
			var img = new Image();
			img.src = item['thumbnail'];
			img_field.appendChild(img);
			fields.push(img_field);
			
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
			fields.push(info_field);
			
			var sidebar_field = document.createElement('td');
			sidebar_field.setAttribute('asin', item['asin']);
			sidebar_field.setAttribute('class', 'sidebar');
			var amount = document.createTextNode(item['amount'] / 100);
			var link = document.createElement('a');
			link.setAttribute('href', item['link']);
			link.setAttribute('target', '_blank');
			var linkText = document.createTextNode("visit product page");
			link.appendChild(linkText);
			var siteName = document.createTextNode(site);
			sidebar_field.appendChild(siteName);
			sidebar_field.appendChild(document.createElement('br'));
			sidebar_field.appendChild(amount);
			sidebar_field.appendChild(document.createElement('br'));
			sidebar_field.appendChild(link);
			fields.push(sidebar_field);
			
			infoNodes.push(fields);
		}
	}
	$(results).each(function (index, item) {build(index, item);});
	console.log(infoNodes);
	return infoNodes;
}
/**
 * This is an instance method of class Collector.
 * 
 * @method Presents json result objects as table elements and adds them to page.
 * @return {Object} table elements
 */
Collector.prototype.present = function() {
	if (this.context == 'keywords') {
		// convert container -> table
		//console.log (this.container[this.site]);
		Collector.buildInfoNodes(this.context, this.site, this.container[this.site]);
	}
	if (this.context == 'asin') {
		// convert container -> table
		Collector.buildInfoNodes(this.context, this.site, this.container[this.site]);
	}
};

/**
 * @method Stores site specific json objects of results in container.
 * @param {Object} result json of server responses as delivered by Parser instance
 */
Collector.prototype.store = function(result) {
	switch (result.site) {
		case 'CA':
			var item = { 'CA' : result.results};
			break;
		case 'DE':
			var item = { 'DE' : result.results};
			break;
		case 'FR':
			var item = { 'FR' : result.results};
			break;
		case 'JP':
			var item = { 'JP' : result.results};
			break;
		case 'UK':
			var item = { 'UK' : result.results};
			break;
		case 'US':
			var item = { 'US' : result.results};
	}
	if (result.context == 'keywords') {
		this.container = item;
		return item;
	}		
	if (result.context == 'asin') {
		this.container = item;
		return item;
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


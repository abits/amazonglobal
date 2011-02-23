<?php
/**
 * Amazon query builder and ajax proxy.
 * 
 * @package Amazon query builder and ajax proxy
 * @author Chris Martel <accidentalbits@googlemail.com>
 */
/**
 * Manages application settings and cookies
 */
class Settings {
	//TODO Add settings and cookie management.
}

/**
 * Retrieves AWS search results and returns JSON objects.
 */
class RequestAgent {
	var $key;
	var $secret;
	var $tag;
	var $site;
	var $string;
	var $results;
	
	function __construct($parameters, $site, $key, $secret, $tag, $version, 
	                     $service, $path) {
		$this->key = $key;
		$this->secret = $secret;
		$this->tag = $tag;
		$this->site = $site;
		$this->string = $parameters; // associative array holding search terms
		$this->version = $version;
		$this->service = $service;
		$this->path = $path;
	}
/**
 * Create properly signed AWS query url.
 * @link http://docs.amazonwebservices.com/AWSECommerceService/latest/DG/
 * @param object $parameters
 * @return string $query_url
 */	
	function make_url($parameters) {
		$host = $this->get_host($this->site);
		$path = $this->path;
			
		$query = array(        
		'Service' => $this->service,
		'AWSAccessKeyId' => $this->key,
		'AssociateTag' => $this->tag,
		'Timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
		'Version' => $this->version,
		);
		
		// Merge in any options that were passed in
		if (is_array($parameters)) {
		$query = array_merge($query, $parameters);
		}
		
		// Do a case-insensitive, natural order sort on the array keys.
		ksort($query);
		
		// create the signable string
		$temp = array();
		foreach ($query as $k => $v) {
		$temp[] = str_replace('%7E', '~', rawurlencode($k)) . '=' . str_replace('%7E', '~', rawurlencode($v));
		}
		$signable = implode('&', $temp);
		
		$stringToSign = "GET\n$host\n$path\n$signable";
		
		// Hash the AWS secret key and generate a signature for the request.
		$hex_str = hash_hmac('sha256', $stringToSign, $this->secret);
		$raw = '';
		for ($i = 0; $i < strlen($hex_str); $i += 2) {
		$raw .= chr(hexdec(substr($hex_str, $i, 2)));
		}
		
		$query['Signature'] = base64_encode($raw);
		ksort($query);
		
		$temp = array();
		foreach ($query as $k => $v) {
		$temp[] = rawurlencode($k) . '=' . rawurlencode($v);
		}
		$final = implode('&', $temp);

		return 'http://' . $host . $path . '?' . $final;	
	}


/**
 * Returns local AWS site url.
 * @param string One of: 'CA', 'DE', 'FR', 'JP', 'UK', 'US'. 
 * @return string Site url corresponding to given country id.
 */		
	function get_host($site) {
		switch ($site) {
			case 'CA':
				$host = 'webservices.amazon.ca';
				break;
			case 'DE':
				$host = 'webservices.amazon.de';
				break;
			case 'FR':
				$host = 'webservices.amazon.fr';
				break;
			case 'JP':
				$host = 'webservices.amazon.co.jp';
				break;
			case 'UK':
				$host = 'webservices.amazon.co.uk';
				break;
			case 'US':
				$host = 'ecs.amazonaws.com';
				break;
			default: 
				$host = '';
		}
		return $host;
	}	
	/**
	 * 
	 * @param object $uri
	 * @param object $timeout [optional]
	 * @param object $connect_timeout [optional]
	 * @return 
	 */
	function remote_load($uri, $timeout = 10, $connect_timeout = 3) {
		$curl_handle = curl_init();
		curl_setopt($curl_handle, CURLOPT_USERAGENT, '127.0.0.1');
		curl_setopt($curl_handle, CURLOPT_URL, $uri);
		curl_setopt($curl_handle, CURLOPT_CONNECTTIMEOUT, $connect_timeout);
		curl_setopt($curl_handle, CURLOPT_TIMEOUT, $timeout);
		curl_setopt($curl_handle, CURLOPT_FOLLOWLOCATION, 1);
		curl_setopt($curl_handle, CURLOPT_HEADER, false);
		curl_setopt($curl_handle, CURLOPT_RETURNTRANSFER, true);

		
		$buffer   = curl_exec($curl_handle);
		$curlinfo = curl_getinfo($curl_handle);
//		
//		header("Access-Control-Allow-Origin: *");
//		header("Pragma: no-cache");
//		header("Cache-Control: no-store, no-cache, max-age=0, must-revalidate");
//		header("Content-Type: text/xml");


		curl_close($curl_handle);
				
		if (($curlinfo['http_code'] < 400) && ($curlinfo['http_code'] != 0)) {
			//return $buffer;
			return new SimpleXMLElement($buffer);
		}
		
		return null;
		}
	
	function get_results() {
		$uri = $this->make_url($this->string);
		//echo "$uri";
		return $this->remote_load($uri);
	}
}
/**
 * Parses XML response from AWS, returns JSON encoded string
 * context-sensitive
 */
class ResponseParser {
	var $xml;
	var $json;
	
	function load_xml($simplexmlobj) {
		$this->xml = $simplexmlobj;		
	}
	
	function get_currency_parameters($currency) {
		if ($currency == "JPY") { // here goes the yen
				$currency_unit = 1.0;
				$currency_format = '%.0f';
			} else { 
				$currency_unit = 0.01;
				$currency_format = '%.2f';
			}
		return array ("code" => $currency,
									"unit" => $currency_unit,
									"format" => $currency_format);	
	}
/**
 * get_array: Build main data array.
 * @method
 * @param {String} $site 
 * @param {String} $context
 * @return {Array} $result_array
 */
	function get_array($site, $context) {
		switch ($context) { // quite verbose, but more readable
			case 'keywords': 
				foreach($this->xml->Items->Item as $item) {
					$asin = (string)$item->ASIN;
					$item_array = array( 
						"site" => $site,  
						"asin" => $asin,
						"url" => (string)$item->DetailPageURL,
						"image" => (string)$item->LargeImage->URL,
						"artist" => ucwords((string)$item->ItemAttributes->Artist),
						"title" => ucwords((string)$item->ItemAttributes->Title),
						"binding" => (string)$item->ItemAttributes->Binding);
					$result_array["$asin"] = $item_array;
				};				
				break;
			case 'asin':
				$currency = $this->get_currency_parameters(
					(string)$this->xml->Items->Item->ItemAttributes->ListPrice->CurrencyCode);
				$result_array = array( 
					"asin" => (string)$this->xml->Items->Item->ASIN,
					"url" => (string)$this->xml->Items->Item->DetailPageURL,
					"image" => (string)$this->xml->Items->Item->LargeImage->URL,
					"artist" => ucwords((string)$this->xml->Items->Item->ItemAttributes->Artist),
					"title" => ucwords((string)$this->xml->Items->Item->ItemAttributes->Title),
					"binding" => (string)$this->xml->Items->Item->ItemAttributes->Binding,
					"list_amount" => sprintf($currency['format'], 
						$this->xml->Items->Item->ItemAttributes->ListPrice->Amount * $currency['unit']),
					"list_currency" => $currency['code'],
					"new_amount" => sprintf($currency['format'], 
						$this->xml->Items->Item->OfferSummary->LowestNewPrice->Amount * $currency['unit']),
					"new_currency" => $currency['code'],
					"used_amount" => sprintf($currency['format'], 
						$this->xml->Items->Item->OfferSummary->LowestUsedPrice->Amount * $currency['unit']),
					"used_currency" => $currency['code']);
					break;
			default:
					$result_array = NULL;
		}
		return $result_array;
	}
}
/**
 * Convert currencies with live rates from Google.
 */
class CurrencyConverter {
	const HOST = "http://www.google.com/ig/calculator";
	
	var $toCurrency;
	var $fromCurrency;
	var $rate;  /* calculate fixed session rate; we don't want to fire a server
	               request each time we need a conversion */
	
	function __construct($toCurrency, $site) {
		$this->toCurrency = $toCurrency;
		$this->fromCurrency = $this->get_code($site);
		$this->rate = $this->init_rate();
	}	
	
	function get_code($site) {
		switch ($site) {
			case "CA":
				$currency = "CAD";
				break;
			case "DE":
				$currency = "EUR";
				break;
			case "FR":
				$currency = "EUR";
				break;
			case "JP":
				$currency = "JPY";
				break;
			case "UK":
				$currency = "GBP";
				break;
			case "US":
				$currency = "USD";
				break;
		}
		return $currency;
	}
	
	function g_json_decode($s) {
		// add "" to keys and values; Googles json is invalid :-0
    $s = preg_replace('/(\w+):/i', '"\1":', $s);
    $s = preg_replace('/: (\w+)/i', ': "\1"', $s);
		return $s;
  }

	function remote_load($uri, $timeout = 10, $connect_timeout = 3) {
		$curl_handle = curl_init();
		curl_setopt($curl_handle, CURLOPT_USERAGENT, '127.0.0.1');
		curl_setopt($curl_handle, CURLOPT_URL, $uri);
		curl_setopt($curl_handle, CURLOPT_CONNECTTIMEOUT, $connect_timeout);
		curl_setopt($curl_handle, CURLOPT_TIMEOUT, $timeout);
		curl_setopt($curl_handle, CURLOPT_FOLLOWLOCATION, 1);
		curl_setopt($curl_handle, CURLOPT_HEADER, false);
		curl_setopt($curl_handle, CURLOPT_RETURNTRANSFER, true);

		$buffer   = curl_exec($curl_handle);
		$curlinfo = curl_getinfo($curl_handle);
		
		header("Access-Control-Allow-Origin: *");
		header("Content-Type: application/json");
		header("Cache-Control: no-store, no-cache, max-age=0, must-revalidate");
		header("Pragma: no-cache");

		curl_close($curl_handle);
				
		if (($curlinfo['http_code'] < 400) && ($curlinfo['http_code'] != 0)) {
			return $this->g_json_decode($buffer); // correct messy Google json
		}
		return null;
	}

	function init_rate() {
		if ($this->fromCurrency != $this->toCurrency) {
			$url = CurrencyConverter::HOST . '?q=1' . $this->fromCurrency . '=?' . $this->toCurrency;
			$response = json_decode($this->remote_load($url), TRUE);
			$this->rate = floatval($response["rhs"]);
		} else {
			$this->rate = 1.0; // no conversion needed, same currencies
		}
	}
	
	function convert($amount) {
			return $amount * $this->rate;
	}
}


/**
 * Dispatches RequestAgents and collects their query results.
 */
class SessionManager {
	const AWS_KEY = 'AKIAJR76TSRZ7NZC3HWA';
	const AWS_SECRET = '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';
	const AWS_TAG = 'cmartel-20';
	const AWS_VERSION = '2010-11-01';
	const AWS_SERVICE = 'AWSECommerceService';
	const AWS_PATH = '/onca/xml';
	
	var $context;
	var $responses = array('CA' => NULL,
								  			 'DE' => NUll,
									  		 'FR' => NUll,
										  	 'JP' => NUll,
											   'UK' => NUll,
											   'US' => NUll,);
	 
	var $results; // context-sensitive meaning!
	
	function __construct($context) {
		$this->context = $context;
	}
	
	function dispatch_agent($string, $site) {
		$agent = new RequestAgent($string, $site, self::AWS_KEY, self::AWS_SECRET, 
		                       self::AWS_TAG, self::AWS_VERSION, 
													 self::AWS_SERVICE, self::AWS_PATH);
		$this->responses[$agent->site] = $agent->get_results();
		}
	
	function parse_responses($response_array) {
		$parser = new ResponseParser();
		foreach ($response_array as $site => $response) {
			if ($response != NULL) {
				$parser->load_xml($response);
				// build different results arrays in different contexts
				switch ($this->context) { 
					case "keywords":
						$this->results = $parser->get_array($site, $this->context);
						break;
					case "asin":
						$this->results["$site"] = $parser->get_array($site, $this->context);
						// add client side currency amounts to data array
						$local_currency = "EUR";
						$converter = new CurrencyConverter($local_currency, $site);
						$converter->init_rate();
						$list_amount = (float)$this->results["$site"]["list_amount"];
						$new_amount = (float)$this->results["$site"]["new_amount"];
						$used_amount = (float)$this->results["$site"]["used_amount"];
						$format = '%.2f';
						$this->results["$site"]["local_list_amount"] = 
							sprintf($format, $converter->convert($list_amount));
						$this->results["$site"]["local_new_amount"] = 
							sprintf($format, $converter->convert($new_amount));
						$this->results["$site"]["local_used_amount"] = 
							sprintf($format, $converter->convert($used_amount));
						$this->results["$site"]["local_currency"] = $local_currency;
						break;
				}
			}
		}
	}
	
	function get_responses() {
		return $this->responses;
	}
	
	function get_results() {
		return $this->results;
	}
}

function delegate_manager($context, $input) {
	// create new manager
	$manager = new SessionManager($context);
	// init request vars
	$sites = $input['Sites'];
	$parameters = array_slice($input, 1); // sites need to be at pos 0
	// tell manager to deploy an agent to each site in the request
	foreach($sites as $site) {
		$manager->dispatch_agent($parameters, $site);
	}
	// parse responses in results
	$manager->parse_responses($manager->get_responses());
	// return parsed results
	return $manager->get_results();
}

function get_context($parameters) {
// determine parameters by testing for certain keys
	$context_identifier = '';
	if (array_key_exists("ItemId", $parameters)) {
		$context_identifier = "asin";
	} elseif (array_key_exists("Keywords", $parameters)) {
		$context_identifier = "keywords";
	} else {
		//TODO error handler, throw exception
		$context_identifier = '';
	}
	return $context_identifier;
	 
}

function send_json($results) {
	// set header for json results
	// prevent caching for IE/GET problems
	header('Cache-Control: no-cache, must-revalidate');
  header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
	// send json
  //header('Content-type: application/json');
  header('Content-type: text/javascript');
	
	if ($results != NULL)  { 
		echo json_encode($results);
	}
}

function build_parameters($context, $input) {
	switch ($context) {
		case 'keywords':
			$parameters = array('Sites' => explode(',', $input['Sites']),
	          	            'Operation' => 'ItemSearch',
													'SearchIndex' => $input['SearchIndex'],
													'Keywords' => $input['Keywords'],
													'ResponseGroup' => 'Medium,ItemAttributes,OfferFull');
			break;
		case 'asin':
			$parameters = array('Sites' => explode(',', $input['Sites']),
	               					'Operation' => 'ItemLookup',
													'ItemId' => $input['ItemId'],
													'ResponseGroup' => 'Medium,ItemAttributes,OfferFull');
			break;
		default: 
			$parameters = NULL;
	}
	return $parameters;
}
	
function main() {
	$context = get_context($_GET);
	$input = build_parameters($context, $_GET);
	$results = delegate_manager($context, $input);
 	send_json($results);
}
function test_driver($context) {
	//var_dump($context);
	$query_kw = array ( 'Sites' => 'DE',
											'Keywords' => 'the national',
										  'SearchIndex' =>	'Music'
										 );
	$query_asin = array ('Sites' => 'DE,UK',
											 'ItemId' => 'B003BKF696');
	if ($context == 'keywords') {
		$input = build_parameters($context, $query_kw);
	} 
	if ($context == 'asin') {
		$input = build_parameters($context, $query_asin);
	} 
	//var_dump($input);
	$results = delegate_manager($context, $input);
 	//var_dump($results);
 	send_json($results);
}

//test_driver('asin');
main();
?>

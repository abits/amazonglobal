<?php
	// http://www.thewhyandthehow.com/building-an-ajax-content-proxy-in-php/
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
		header("Pragma: no-cache");
		header("Cache-Control: no-store, no-cache, max-age=0, must-revalidate");
		header("Content-Type: text/xml");


		curl_close($curl_handle);
				
		if (($curlinfo['http_code'] < 400) && ($curlinfo['http_code'] != 0)) {
			return $buffer;
		}
		
		return null;
		}
	// http://www.thewhyandthehow.com/signing-aws-requests-in-php/
	//function makeAWSUrl($parameters, $associate_tag, $access_key, $secret_key, $aws_version = '2009-06-01') {
	function makeAWSUrl($parameters, $access_key, $secret_key, $aws_version = '2009-06-01') {
		$host = 'webservices.amazon.de';
		$path = '/onca/xml';
		
		$query = array(        
		'Service' => 'AWSECommerceService',
		'AWSAccessKeyId' => $access_key,
		//'AssociateTag' => $associate_tag,
		'Timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
		'Version' => $aws_version,
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
		$hex_str = hash_hmac('sha256', $stringToSign, $secret_key);
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
		
		//print 'http://' . $host . $path . '?' . $final;
		return 'http://' . $host . $path . '?' . $final;
		}
	$url = makeAWSUrl($_GET, 'AKIAJR76TSRZ7NZC3HWA', '/FCrJ8LWNOuGJSjs7iGwt4ntlnFD1zpY9oH0Ppxu');
	
	//TODO: request should return json instead of xml
	//print $url;
	print remote_load($url);
?>
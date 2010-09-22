<?php
    //ob_start("ob_gzhandler");
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
			//print my_json_decode($buffer);
			//return $buffer;
			
			$buffer = preg_replace('/(\w+):/i', '"\1":', $buffer);
        	$buffer = preg_replace('/: (\w+)/i', ': "\1"', $buffer);
			return $buffer; // some loops cause Googles code is invalid
		}
		return null;
	}
	
	function my_json_decode($s) {
        $s = preg_replace('/(\w+):/i', '"\1":', $s);
        $s = preg_replace('/: (\w+)/i', ': "\1"', $s);
		//print $s;
        return json_decode(sprintf('{%s}', $s));
    }
		
	function makeGoogleUrl($parameters) {
		$host = 'google.com/ig/calculator';

		$temp = array();
		foreach ($parameters as $k => $v) {
			$temp[] = rawurlencode($k) . '=' . rawurlencode($v);
		}
		$final = implode('&', $temp);
		
		//print 'http://' . $host . $path . '?' . $final;
		return 'http://' . $host . $path . '?' . $final;
		}
	$url = makeGoogleUrl($_GET);
	//print $url;
	
	//TODO: request should return json instead of xml
	//print $url;
	print remote_load($url);
?>
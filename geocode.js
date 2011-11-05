
var http = require('http'), querystring = require('querystring');

function Geocoder(opts) {
	opts = opts || { };
	this.clientName = opts.username || "livepages";
	this.clientPassword = opts.apiKey || "livepages";
	this.configuration = opts.configuration || "global-decarta-hi-res";
}

Geocoder.prototype.get = function(address, callback) {
	
	var addresses = Array.isArray(address) ? address : Array.prototype.slice.call(arguments, 0, -1) ;
	var callback = arguments[arguments.length - 1];
	
	var addressData = "";
		
	for (var i in addresses) 
		addressData += '<xls:Address countryCode="CA" language="EN"><xls:freeFormAddress>'+addresses[i].replace(/&|<|>/, function(s) { 
			if (s == "&")
				return "&amp;";
			if (s == "<")
				return "&lt;";
			if (s == ">")
				return "&gt;";
		})+'</xls:freeFormAddress></xls:Address>';
	
	
	var clientName = "livepages", clientPassword = "livepages", configuration = "global-decarta-hi-res" ;
	var xmlData =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + 
		'<xls:XLS version="1" xls:lang="en" xmlns:xls="http://www.opengis.net/xls">' +
	        '<xls:RequestHeader clientName="' + this.clientName +
	        '" sessionID="' + 123 +
	        '" clientPassword="' + this.clientPassword +
	        '" configuration="' + this.configuration +
	        '"/>' +
			'<xls:Request maximumResponses="10" version="1.0" requestID="'+1+'" methodName="GeocodeRequest">' +
				'<xls:GeocodeRequest returnFreeForm="false">' +
					addressData +
				'</xls:GeocodeRequest>' +
			'</xls:Request>' +
		'</xls:XLS>';
	
	var path = '/openls/JSON?'+querystring.stringify({
		reqID: 1,
		responseFormat: "JSON",
		data: xmlData,
		callback: null,
		numChunks: 1,
		chunkNo: 1
	});
	
	http.get({
		host: "wsdds3.dz.sv.decartahws.com",
		port: 80,
		path: path
	}, function(res) {
		var buf = "";
		res.on("data", function(data) {
			buf += data;
		}).on("end", function() {
			buf = JSON.parse(buf.slice(1,-1));
			if (buf.response.XLS.Response.numberOfResponses > 0) {
				var list = buf.response.XLS.Response.GeocodeResponse.GeocodeResponseList;
				if (addresses.length == 1) 
					list = [list];
				
				out = [];
				for (var k in list) {
					var matches = list[k]
					if (matches.numberOfGeocodedAddresses > 1) {
						for (var i in matches) {
							var match = matches[i];
							for (var j = 0; j < match.length; ++j) {
								var points = match[j].Point.pos.split(" ");
								points[0] = parseFloat(points[0]);
								points[1] = parseFloat(points[1]);
								points.lat = points[0]; points.lon = points[1];
								out.push(points);
								break; //Only take first match
							}	
						}
					} else {
						var points = matches.GeocodedAddress.Point.pos.split(" ");
						points[0] = parseFloat(points[0]);
						points[1] = parseFloat(points[1]);
						points.lat = points[0]; points.lon = points[1];
						out.push(points);
					}
				}
				callback(Array.isArray(address) || addresses.length > 1 ? out : out[0]);
			} else {
				callback(Array.isArray(address) || addresses.length > 1 ? new Array(addresses.length) : null);
			}
		})
	})
}

exports.create = function(opts) {
	return new Geocoder(opts);
}

var geocoder = null;

exports.get = function() {
	if (!geocoder)
		geocoder = new Geocoder(exports.settings);
	Geocoder.prototype.get.apply(geocoder, arguments);
}

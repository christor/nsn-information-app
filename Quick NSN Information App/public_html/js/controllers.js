'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
        .controller('MyCtrl1', ['$scope', '$resource', function($scope, $resource) {
                $scope.query = "";
                $scope.results = {};
                $scope.nsn = '010077988';
                $scope.nsnUri = '';
                $scope.nsnsInClass = [];
                $scope.nsnProperties = [];
                $scope.nsnConstraints = [];
                $scope.nsnClasses = [];
                $scope.nsnSuppliers = [];
                $scope.specs = [];
                $scope.queryResource =
                        $resource('http://api.xsb.com/sparql/query', {}, {
                            post: {method: 'POST',
                                headers: {'Accept': 'application/json',
                                    'Content-Type': 'application/x-www-form-urlencoded'}
                            }});
                $scope.cnsResource =
                        $resource('http://api.xsb.com/company-name-standardizer/api/name/:name', {}, {
                            get: {method: 'GET',
                                headers: {'Accept': 'text/plain'},
                                transformResponse: function(data, headersGetter) {
                                    return {"stdName": data};
                                }
                            }});
                $scope.pnsResource =
                        $resource('http://api.xsb.com/partnumber-standardizer/api/partNumber/:pn', {}, {
                            get: {method: 'GET',
                                headers: {'Accept': 'text/plain'},
                                transformResponse: function(data, headersGetter) {
                                    return {"stdPn": data};
                                }
                            }});
                $scope.loadNsn = function(nsn) {
                    $scope.nsn = nsn;
                    $scope.queryNsn();
                };
                $scope.queryNsn = function() {
                    var query = "SELECT * { ?n <http://xsb.com/swiss/product#nationalItemId> \"" + $scope.nsn + "\" } limit 100";
                    $scope.query += "\n\n" + query;
                    $scope.nsnUri = "";
                    $scope.queryResource.post({}, $.param({query: query}),
                            function(e) {
                                $scope.results = e.results;
                                if (e.results && e.results.bindings && e.results.bindings[0] && e.results.bindings[0].n.value) {
                                    $scope.nsnUri = e.results.bindings[0].n.value;
                                    $scope.queryNsnProperties();
                                    $scope.nsnClasses = [];
                                    $scope.querySuperClasses($scope.nsnClasses, $scope.nsnUri);
                                    $scope.querySuppliers();
                                } else {
                                    $scope.nsnUri = 'N/A';
                                }
                            },
                            function(e) {
                            }
                    );
                };
                $scope.queryNsnProperties = function() {
                    var query = "SELECT distinct ?p ?v ?vr {  \n\
                                               <" + $scope.nsnUri + "> (rdfs:subClassOf)* ?a . \n\
                                               ?a owl:onProperty ?pr .  \n\
                                               ?a (owl:hasValue) ?vr .\n\
                                               ?pr rdfs:label ?p .\n\
                                               OPTIONAL { ?vr rdfs:label ?v }  .\n\
                                    } order by ?p ?vr";
                    $scope.query += "\n\n" + query;
                    $scope.nsnProperties = 'loading';
                    $scope.queryResource.post({}, $.param({"query": query}),
                            function(e) {
                                $scope.nsnProperties = [];
                                for (var i = 0; i < e.results.bindings.length; i++) {
                                    var name = e.results.bindings[i].p.value;
                                    var value = null;
                                    if (e.results.bindings[i].vr.type === "literal") {
                                        value = e.results.bindings[i].vr.value;
                                    } else if (e.results.bindings[i].v) {
                                        value = (e.results.bindings[i].v.value);
                                    }
                                    if (value) {
                                        $scope.nsnProperties.push({
                                            "name": name,
                                            "value": value
                                        });
                                    }
                                }
                                $scope.queryEvenMoreNsnProperties();
                            },
                            function(e) {
                            }
                    );
                };
                $scope.queryNsnConstraints = function() {
                    var query = "SELECT distinct ?p (if(bound(?vl),?vl,str(?vr)) as ?v) \n\
                                    { \n\
                                               <" + $scope.nsnUri + "> (rdfs:subClassOf)* ?a . \n\
                                               ?a owl:onProperty ?pr .  \n\
                                               ?a (owl:someValuesFrom|owl:allValuesFrom|owl:onDataRange|owl:onClass) ?vr .\n\
                                               ?pr rdfs:label ?p .\n\
                                               OPTIONAL { ?vr rdfs:label ?vl }  .\n\
                                    } limit 100";
                    $scope.query += "\n\n" + query;
                    $scope.nsnConstraints = 'loading';
                    $scope.queryResource.post({}, $.param({"query": query}),
                            function(e) {
                                $scope.nsnConstraints = [];
                                for (var i = 0; i < e.results.bindings.length; i++) {
                                    var name = e.results.bindings[i].p.value;
                                    var value = e.results.bindings[i].v.value;
                                    $scope.nsnConstraints.push({
                                        "name": name,
                                        "value": value,
                                        "constraint": true
                                    });
                                }
                            },
                            function(e) {
                            }
                    );
                };
                $scope.queryNsnsInClass = function(classUri) {
                    var query = "SELECT * { ?n (rdfs:subClassOf)* <" + classUri + "> . ?n <http://xsb.com/swiss/product#nationalItemId> ?nl  } LIMIT 100";
                    $scope.query += "\n\n" + query;
                    $scope.nsnsInClass = 'loading';
                    $scope.queryResource.post({}, $.param({"query": query}),
                            function(e) {
                                $scope.nsnsInClass = [];
                                for (var i = 0; i < e.results.bindings.length; i++) {
                                    $scope.nsnsInClass.push({
                                        "label": e.results.bindings[i].nl.value,
                                        "uri": e.results.bindings[i].n.value
                                    });
                                }
                            },
                            function(e) {
                            }
                    );
                };
                $scope.queryMoreNsnProperties = function() {
                    var query = "SELECT ?p ?v { \n\
                                               <" + $scope.nsnUri + "> (rdfs:subClassOf)* ?a . \n\
                                               ?a owl:onProperty ?pr .  \n\
                                               ?a (owl:hasValue) ?v .\n\
                                               ?pr rdfs:label ?p .\n\
                                 }";
                    $scope.query += "\n\n" + query;
                    $scope.queryResource.post({}, $.param({"query": query}),
                            function(e) {
                                for (var i = 0; i < e.results.bindings.length; i++) {
                                    if (e.results.bindings[i].p && e.results.bindings[i].v) {
                                        var name = e.results.bindings[i].p.value;
                                        var value = e.results.bindings[i].v.value;
                                        $scope.nsnProperties.push({
                                            "name": name,
                                            "value": value
                                        });
                                    }
                                }
                                $scope.queryEvenMoreNsnProperties();
                            },
                            function(e) {
                            }
                    );
                };
                $scope.queryEvenMoreNsnProperties = function() {
                    var query = "select DISTINCT ?p ?v { \n\
                                               SELECT ?a (group_concat(if(bound(?vrol),?vrol,xsd:string(?vro)) ; separator = ' ') as ?v)  ?p { <" + $scope.nsnUri + "> (rdfs:subClassOf)* ?a . \n\
                                               ?a owl:onProperty ?pr .  \n\
                                               ?a (owl:hasValue|owl:someValuesFrom|owl:allValuesFrom|owl:onDataRange|owl:onClass) ?vr .\n\
                                               ?pr rdfs:label ?p .\n\
                                               ?vr a ?vrt . ?vrt (rdfs:subClassOf)* <http://xsb.com/swiss/types#ODE_Parameterized_Types> . \n\
                                               ?vr (!rdf:type) ?vro . \n\
                                               optional { ?vro rdfs:label ?vrol }        \n\
                            } group by ?a ?p } ";
                    $scope.query += "\n\n" + query;
                    $scope.queryResource.post({}, $.param({"query": query}),
                            function(e) {
                                for (var i = 0; i < e.results.bindings.length; i++) {
                                    if (e.results.bindings[i].p && e.results.bindings[i].v) {
                                        var name = e.results.bindings[i].p.value;
                                        var value = e.results.bindings[i].v.value;
                                        $scope.nsnProperties.push({
                                            "name": name,
                                            "value": value
                                        });
                                    }
                                }
                                $scope.queryNsnConstraints();
                            },
                            function(e) {
                            }
                    );
                };
                $scope.querySuperClasses = function(list, classUri) {
                    var query = "SELECT ?c ?cr ?cd { <" + classUri + "> rdfs:subClassOf ?cr . \n\
                                               ?cr rdfs:label ?c . \n\
                                               OPTIONAL { ?cr <http://purl.org/dc/terms/description> ?cd } .\n\
                                    } limit 1";
                    $scope.query += "\n\n" + query;
                    $scope.queryResource.post({}, $.param({"query": query}),
                            function(e) {
                                $scope.results = e.results;
                                for (var i = 0; i < e.results.bindings.length; i++) {
                                    var v = {
                                        "label": e.results.bindings[i].c.value,
                                        "uri": e.results.bindings[i].cr.value
                                    };
                                    if (e.results.bindings[0].cd)
                                        v["description"] = e.results.bindings[0].cd.value;

                                    $scope.nsnClasses.unshift(
                                            v
                                            );
                                    $scope.querySuperClasses(list, e.results.bindings[0].cr.value);
                                }
                            },
                            function(e) {
                            }
                    );
                };
                $scope.querySuppliers = function() {
                    var query = "SELECT DISTINCT ?v {\n\
                                  ?n <http://xsb.com/swiss/logistics#hasProductNIIN> <" + $scope.nsnUri + "> . \
                                  ?n <http://xsb.com/swiss/logistics#hasReferenceNumber> ?v \
                                }";
                    $scope.query += "\n\n" + query;
                    $scope.nsnSuppliers = "loading";
                    $scope.queryResource.post({}, $.param({"query": query}),
                            function(e) {
                                $scope.nsnSuppliers = [];
                                for (var i = 0; i < e.results.bindings.length; i++) {
                                    $scope.querySupplierInfo(e.results.bindings[i].v.value);
                                }
                            },
                            function(e) {
                            }
                    );
                };
                $scope.querySupplierInfo = function(refNum) {
                    var query = "SELECT DISTINCT ?cn ?pn (concat(?street, ' ', ?locality, ' ', ?region) as ?ca) {\n\
                                  <" + refNum + "> <http://xsb.com/swiss/logistics#hasPartNumber> ?pn . \n\
                                  <" + refNum + "> <http://xsb.com/swiss/logistics#hasCage> ?cage . \n\
                                  ?cage <http://xsb.com/swiss/logistics#hasCageName> ?cn . \n\
                                }";
//                                  optional { ?cage <http://www.w3.org/2006/vcard/ns#hasAddress> ?address . \n\
//                                             ?address <http://www.w3.org/2006/vcard/ns#street-address> ?street . \n\
//                                             ?address <http://www.w3.org/2006/vcard/ns#locality> ?locality . \n\
//                                             ?address <http://www.w3.org/2006/vcard/ns#region> ?region } .\n\
                    $scope.query += "\n\n" + query;
                    $scope.queryResource.post({}, $.param({"query": query}),
                            function(e) {
                                for (var i = 0; i < e.results.bindings.length; i++) {
                                    var v = {
                                        "name": e.results.bindings[i].cn.value,
                                        "pn": e.results.bindings[i].pn.value,
//                                        "addr": e.results.bindings[i].ca.value,
//                                        "mapurl":"https://www.google.com/maps/embed/v1/search?q=" + encodeURIComponent(e.results.bindings[i].ca.value) + "&key=AIzaSyCrShHOFj5dchG6L05NNxGSNDOw4qseFlw"
                                    };
                                    $scope.stdName(v);
                                    $scope.stdPn(v);
                                    $scope.nsnSuppliers.push(v);
                                }
                            },
                            function(e) {
                            }
                    );
                };
                $scope.stdName = function(obj) {
                    $scope.cnsResource.get({"name": (obj.name)},
                    function(e) {
                        obj.stdName = (e.stdName);
                    },
                            function(e) {
                            }
                    );
                };
                $scope.stdPn = function(obj) {
                    $scope.pnsResource.get({"pn": encodeURIComponent(obj.pn)},
                    function(e) {
                        obj.stdPn = decodeURIComponent(e.stdPn);
                    },
                            function(e) {
                            }
                    );
                };
            }])
        ;


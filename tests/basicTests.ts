import ts = require("raml-typesystem-light")
import chai = require("chai");
import scopes=require("../src/scopes");
var assert = chai.assert;
describe("JSON Schemas testing", function () {
    it("basic case", function () {
        var type = ts.parseJSON("Hello", {
            properties: {
                name: "string",
                lastName: "string"
            }
        })
        var rs = scopes.specialize(type, []);
        assert(rs.isObject());
        assert(rs.property("name"))
        assert(rs.property("lastName"))
    });
    it("basic scope", function () {
        var type = ts.parseJSON("Hello", {
            properties: {
                name: "string",
                lastName: {
                    type: "string",
                    "(scopes)": "read"
                }
            }
        });
        var rs = scopes.specialize(type, []);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("lastName"));

        var rs = scopes.specialize(type, ["read"]);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("lastName"));

        var rs = scopes.specialize(type, ["read", "write"]);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("lastName"));

        var rs = scopes.specialize(type, ["write"]);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("lastName"));
        assert(rs.validate({"name": "Pavel"}).isOk())
        assert(!rs.validate({"name": "Pavel", "lastName": "A"}, true).isOk())
        assert(rs.properties().length == 1);
    });
    it("transitive scopes 1", function () {
        var typeC = ts.parseJSONTypeCollection({
            types: {
                Pet: {
                    properties: {
                        name: "string",
                        "kind?": "string",
                        "bio?": {
                            type: "string",
                            "(scopes)": "read",
                        }
                    }
                },
                Person: {
                    properties: {
                        name: "string",
                        lastName: "string",
                        "pets?": {
                            type: "Pet[]",
                            "(scopes)": ["read", "list"]
                        }
                    }
                }
            }
        });
        var type = typeC.getType("Person");
        var rs = scopes.specialize(type, []);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("pets"));

        var rs = scopes.specialize(type, ["read"]);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("pets"));
        var t = rs.property("pets").range().componentType();
        assert(t.property("name"))
        assert(t.property("bio"))

        var rs = scopes.specialize(type, ["list"]);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("pets"));
        var t = rs.property("pets").range().componentType();
        assert(t.property("name"))
        assert(!t.property("bio"))
    });
    it("transitive scopes 2", function () {
        var typeC = ts.parseJSONTypeCollection({
            types: {
                Pet: {
                    properties: {
                        name: "string",
                        "kind?": "string",
                        "bio?": {
                            type: "string",
                            "(scopes)": "read",
                        }
                    }
                },
                Person: {
                    properties: {
                        name: "string",
                        lastName: "string",
                        "pet?": {
                            type: "Pet",
                            "(scopes)": ["read", "list"]
                        }
                    }
                }
            }
        });
        var type = typeC.getType("Person");
        var rs = scopes.specialize(type, []);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("pet"));

        var rs = scopes.specialize(type, ["read"]);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("pet"));
        var t = rs.property("pet").range();
        assert(t.property("name"))
        assert(t.property("bio"))

        var rs = scopes.specialize(type, ["list"]);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("pet"));
        var t = rs.property("pet").range();
        assert(t.property("name"))
        assert(!t.property("bio"))
    });
    it("transitive scopes 3", function () {
        var typeC = ts.parseJSONTypeCollection({
            types: {
                Pet: {
                    properties: {
                        name: "string",
                        "kind?": "string",
                        "bio?": {
                            type: "string",
                            "(scopes)": "read",
                        }
                    }
                },
                PetHolder: {
                    properties: {
                        pets: "Pet[]"
                    }
                },
                Person: {
                    properties: {
                        name: "string",
                        lastName: "string",
                        "pet?": {
                            type: "PetHolder",
                            "(scopes)": ["read", "list"]
                        }
                    }
                }
            }
        });
        var type = typeC.getType("Person");
        var rs = scopes.specialize(type, []);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("pet"));

        var rs = scopes.specialize(type, ["read"]);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("pet"));
        var t = rs.property("pet").range().property("pets").range().componentType();
        assert(t.property("name"))
        assert(t.property("bio"))

        var rs = scopes.specialize(type, ["list"]);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("pet"));
        var t = rs.property("pet").range().property("pets").range().componentType();
        assert(t.property("name"))
        assert(!t.property("bio"))
    });
    it("inheritance 1", function () {
        var typeC = ts.parseJSONTypeCollection({
            types: {
                Pet: {
                    properties: {
                        name: "string",
                        "kind?": "string",
                        "bio?": {
                            type: "string",
                            "(scopes)": "read",
                        }
                    }
                },
                PetHolder: {
                    properties: {
                        pets: "Pet[]"
                    }
                },
                Person: {
                    properties: {
                        name: "string",
                        lastName: "string",
                        "pet?": {
                            type: "PetHolder",
                            "(scopes)": ["read", "list"]
                        }
                    }
                },
                Person2:{
                  type: "Person"
                }
            }
        });
        var type = typeC.getType("Person2");
        var rs = scopes.specialize(type, []);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("pet"));

        var rs = scopes.specialize(type, ["read"]);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("pet"));
        var t = rs.property("pet").range().property("pets").range().componentType();
        assert(t.property("name"))
        assert(t.property("bio"))

        var rs = scopes.specialize(type, ["list"]);
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("pet"));
        var t = rs.property("pet").range().property("pets").range().componentType();
        assert(t.property("name"))
        assert(!t.property("bio"))
    });
    it("unions", function () {
        var typeC = ts.parseJSONTypeCollection({
            types: {
                Pet: {
                    properties: {
                        name: "string",
                        "kind?": "string",
                        "bio?": {
                            type: "string",
                            "(scopes)": "read",
                        }
                    }
                },
                PetHolder: {
                    properties: {
                        pets: "Pet[]"
                    }
                },
                Person: {
                    properties: {
                        name: "string",
                        lastName: "string",
                        "pet?": {
                            type: "PetHolder",
                            "(scopes)": ["read", "list"]
                        }
                    }
                },
                Person2: {
                    type: "Person | string"
                }
            }
        });
        var type = typeC.getType("Person2");
        var rs = scopes.specialize(type, []);
        rs=rs.allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("pet"));
        var rs = scopes.specialize(type, ["read"]).allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("pet"));
        var t = rs.property("pet").range().property("pets").range().componentType();
        assert(t.property("name"));
        assert(t.property("bio"));
        var rs = scopes.specialize(type, ["list"]).allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("pet"));
        var t = rs.property("pet").range().property("pets").range().componentType();
        assert(t.property("name"));
        assert(!t.property("bio"));
    });
    it("recursive", function () {
        var typeC = ts.parseJSONTypeCollection({
            types: {
                Person: {
                    properties: {
                        name: "string",
                        lastName: "string",
                        "friends?": {
                            type: "Person[]",
                            "(scopes)": ["read", "list"]
                        }
                    }
                },

            }
        });
        var type = typeC.getType("Person");
        var rs = scopes.specialize(type, []);
        rs=rs.allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("friends"));
        var rs = scopes.specialize(type, ["read"]).allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("friends"));
        var t = rs.property("friends").range().componentType();
        assert(t.property("name"));
        assert(t.property("friends"));
        var rs = scopes.specialize(type, ["list"]).allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("friends"));
        var t = rs.property("friends").range().componentType();
        assert(t.property("name"));
        assert(t.property("friends"));
    });
    it("scopesModifications", function () {
        var typeC = ts.parseJSONTypeCollection({
            types: {
                Person: {
                    properties: {
                        name: "string",
                        lastName: "string",
                        "friends?": {
                            type: "Person[]",
                            "(scopes)": ["-read", "-list"]
                        }
                    }
                },

            }
        });
        var type = typeC.getType("Person");
        var rs = scopes.specialize(type, []);
        rs=rs.allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("friends"));
        var rs = scopes.specialize(type, ["read"]).allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("friends"));
        var t = rs.property("friends").range().componentType();
        assert(t.property("name"));
        assert(!t.property("friends"));

    });
    it("negated scopes", function () {
        var typeC = ts.parseJSONTypeCollection({
            types: {
                Person: {
                    properties: {
                        name: "string",
                        lastName: "string",
                        "friends?": {
                            type: "Person[]",
                            "(scopes)": ["read", "!list"]
                        }
                    }
                },

            }
        });
        var type = typeC.getType("Person");
        var rs = scopes.specialize(type, []);
        rs=rs.allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("friends"));
        var rs = scopes.specialize(type, ["read"]).allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("friends"));
        var t = rs.property("friends").range().componentType();
        assert(t.property("name"));
        assert(t.property("friends"));
        var rs = scopes.specialize(type, ["list"]).allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("friends"));
    });
    it("multiple scopes", function () {
        var typeC = ts.parseJSONTypeCollection({
            types: {
                Person: {
                    properties: {
                        name: "string",
                        lastName: "string",
                        "friends?": {
                            type: "Person[]",
                            "(scopes)": ["read^admin"]
                        }
                    }
                },

            }
        });
        var type = typeC.getType("Person");
        var rs = scopes.specialize(type, []);
        rs=rs.allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("friends"));
        var rs = scopes.specialize(type, ["read"]).allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(!rs.property("friends"));
        var rs = scopes.specialize(type, ["read","admin"]).allOptions()[0];
        assert(rs.isObject());
        assert(rs.property("name"));
        assert(rs.property("friends"));
    });
    it("basic transform", function () {
        var typeC = ts.parseJSONTypeCollection({
            types: {
                Person: {
                    properties: {
                        name: "string",
                        lastName: "string",
                        "friends?": {
                            type: "Person[]",
                            "(scopes)": ["read^admin"]
                        }
                    }
                },

            }
        });
        var type = typeC.getType("Person");
        var instance={
            name:"Pavel",
            lastName:"Petrochenko",
            friends:[
                {
                    name: "Denis",
                    lastName:"Denisenko"
                }
            ]
        }
        var vl=scopes.toShape(instance,type,["read"]);
        assert.deepEqual(vl,{name:"Pavel",
            lastName:"Petrochenko"})
        var vl=scopes.toShape(instance,type,["read","admin"]);
        assert.deepEqual(vl,instance)
    });
})

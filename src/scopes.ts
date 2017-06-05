import rti=require("raml1-domain-model")
import {isNullOrUndefined} from "util";

interface TransformationRecord {
    t: rti.Type;
    ps: string;
    transformed: rti.Type;
}
const stack: TransformationRecord[] = [];

function searchStack(t: rti.Type, providedScopes: string[]) {
    var rs: rti.Type = null;
    stack.forEach(x => {
        if (x.t == t && x.ps == providedScopes.join(',')) {
            rs = x.transformed;
        }
    })
    return rs;
}

export function toShape(obj: any, t: rti.Type, providedScopes: string[]): any {
    if (!obj){
        return obj;
    }
    if (typeof obj=="object"){
        if (Array.isArray(obj)){
            var rs:any[]=obj;
            var result:any[]=[];
            var ct=t.componentType();
            rs.forEach(x=>{
                var vl=toShape(x,ct,providedScopes);
                result.push(vl);
            })
            return result;
        }
        else{
           var res:any={};
           var transformedType=specialize(t,providedScopes);
           transformedType.properties().forEach(x=>{
                var vl=obj[x.name()];
                if (!isNullOrUndefined(vl)){
                    res[x.name()]=toShape(vl,x.range(),providedScopes);
                }
           });
           return res;
        }
    }
    else{
        return obj;
    }
}
export function specialize(t: rti.Type, providedScopes: string[]): rti.Type {
    var existing: {[name: string]: string[]} = {}
    if (t.isBuiltin()) {
        return t;
    }

    var onStack = searchStack(t, providedScopes);
    if (onStack) {
        return onStack;
    }
    var hasScopes = false;
    t.properties().forEach(x => {
        var ss = x.name();
        var scopes: string[] = null;

        x.range().annotations().forEach(a => {
            if (a.name() == "scopes") {
                var value = a.value();
                if (typeof value == "string") {
                    scopes = [value];
                }
                else {
                    scopes = value;
                }
            }
        })

        if (scopes == null) {
            existing[ss] = ['$$$$'];
        }
        else {
            var scopesAfter = [];
            var additionalScopes=[];
            var removedScopes=[];
            var negatedScopes=[]
            scopes.forEach(x => {
                let items = x.substring(1);
                if (x.charAt(0)=='+'){
                    additionalScopes.push(items);
                    scopesAfter.push(items)
                }
                else if (x.charAt(0)=='!'){
                    negatedScopes.push(items)
                }
                else if (x.charAt(0)=='-'){
                    removedScopes.push(items);
                    scopesAfter.push(items)
                }
                else{
                    scopesAfter.push(x);
                }
            });
            var negated = providedScopes.filter(x => negatedScopes.indexOf(x) != -1);
            if (negated.length==0) {
                var matching = providedScopes.filter(x => scopesAfter.indexOf(x) != -1);

                if (matching.length > 0) {
                    var all = [].concat(providedScopes).concat(additionalScopes).filter(x => removedScopes.indexOf(x) == -1);
                    existing[ss] = Array.from(new Set(all));
                }
                else{
                    scopesAfter.forEach(v=>{
                        var splitted=v.split("^");
                        if (splitted.length>1){
                            var allMatched=splitted.filter(x=>providedScopes.indexOf(x)!=-1);
                            if (allMatched.length==splitted.length){
                                var all = [].concat(providedScopes).concat(additionalScopes).filter(x => removedScopes.indexOf(x) == -1);
                                existing[ss] = Array.from(new Set(all));
                            }
                        }
                    })
                }
            }
        }
    });

    var trans: TransformationRecord = null;
    try {
        return t.cloneWithFilter((f, transformed) => {
            if (trans == null) {
                trans = {t: t, ps: providedScopes.join(","), transformed: transformed};
                stack.push(trans);
            }
            //transformationStack.set(t, transformed);
            if (f.facetName() == "items") {
                var type = f.value();
                var pi = (<rti.types.PropertyIsFacet>f);
                return pi.cloneWithType(specialize(type, providedScopes));
            }
            if (f.facetName() == "propertyIs") {
                var type = f.value();
                var pi = (<rti.types.PropertyIsFacet>f);
                var name = pi.name;
                if (existing[name]) {
                    var ass=existing[name];
                    if (ass.length==1&&ass[0]=='$$$$'){
                        ass=providedScopes;
                    }
                    return pi.cloneWithType(specialize(type, ass));
                }
                return false;
            }
            else if (f.facetName() == "hasProperty") {
                var nm = f.value();
                if (existing[nm]) {
                    return true;
                }
                return false;
            }
            return true;
        }, t0 => specialize(t0, providedScopes));
    } finally {
        stack.pop();
    }
}
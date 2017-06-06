# Scopes

This module is devoted to support of scopes for RAML types.

Scopes, is the way to mark properties as existing only in some particular contexts
 
 
```raml
Person:
  properties:
    name: string
    lastName: string   
    friends:
      type: Person[]
      (sc.scopes): read
``` 



Usage:

Module exports two functions:

`specialize(t:Type,scopes:string[]):Type` - gives version of the type with respect to the given scopes

`toShape(obj:any,t:Type,scopes:string[]):any` - cleanups properties of the instance which are not visible
in the given scopes
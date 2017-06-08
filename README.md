# RAML Typesystem Scopes

### Abstract

Different use cases require us to expose different representations(shapes) of same business entity. 

![Diagram](Domain_model.png)

To highlight a problem let's review following example API:
```raml
#%RAML 1.0
title: "Person api"
mediaType: application/json
types:
  NewPerson:
    properties:
      name: string
      lastName: string
  Person:
    type: NewPerson
    properties:
      id: integer
  DetailedPerson:
    type: Person
    properties:
      tasks: string[]
/people:
  get:
    responses:
      200:
        body: Person[]
  post:
    body:  NewPerson
  /{id}:
    get:
      responses:
        200:
          body: DetailedPerson
```

In this API we have 3 RAML Types describing different shapes of one conceptual business entity. This project is based
on the observation that usually people create different shapes for one business entity when they need to conditionally
hide some entity properties depending from semantical context of type usage. 

For example `id` and `subtasks` properties has no sense for the `Person` which is not created yet. 

We solve this situation by providing a way to mark properties as a properties which exists only in some semantic contexts, and a tool which allows to get version of RAML type, specialized for particular context of usage. 

As we think this approach allows to describe APIs in a more concise and both more machine and human readable way. For example if your ecosystem supports our tool api above may be rewritten as:

```raml
#%RAML 1.0
title: "Person"
mediaType: application/json
uses:
  core: core.raml
types:
  Person:
    properties:
      id?:
        (core.scopes): create
        type: integer
      name: string
      lastName: string
      tasks?:
        (core.scopes): ["!list", "!create"]
        type: string[]
/people:
  get:
    (core.scopes): list
    responses:
      200:
        body: Person[]
  post:
    (core.scopes): create
    body:  Person
  /{id}:
    get:
      responses:
        200:
          body: Person

```
Basically in this case `Person` type is specialized depending from the roles in the context:

![Diagram](contextSpecialization.png)

### Specification

To support this we introduce an annotaton `scopes` which can accept string or array of string and can be used on RAML types and properties declarations or alternatively on resource and methods to mark semantic roles associated with them. 

The value of the annotation is the list of scope expressions. When scope processor specializes type or instance it goes through this list and marks the property as existing if any of this expressions is satisfied, and there is no negating scope expressions which are satisfied.

Syntax for scope expressions:
 *  `!{scopeName}` - requires that scope `scopeName` should not present in specialization context.
 *  `{scopeName}^{scopeName1}` - requires that both `scopeName` and `scopeName1` scopes should present in specialization context (logical and)
 *  `-{scopeName}` - requires that scope `scopeName` should present in specialization context but removes `scopeName` scope from a context for property range specialization
 *  `+{scopeName}` - is never sutisfied unless `scopeName` scope already present in context, but if property passed speciaization(for example through another scope expression presented in the context), scope `scopeName` will be passed for property range specialization

#### Algorithm for type specialization:

* If specialized type is an object type then take all properties of specialized type and for each of them do the following:

  1. Check if the property range has `scopes` annotation. If this annotation is absent property exists unconditionally. In this case you should create a property with same name but the property range should be specialized against current scopes.
  
  2. Take the value of the scopes annotation and execute scope expressions against currrent scopes. If the property passes scope expressions, adjust scopes in context with regards to '+' and '-' scope modifiers and create a specialized version of property range basing on this adjusted scopes.

* If specialized type is an array type, derive new array type with a component type which is a specialized version of current array type component

* If specialized type is a scalar, then there is nothing to do.


* If specialized type is a union derive a new union type which consists from specialized options of current union type.

In all cases, everything except of property declarations stays unchanged.

### Usage:

Module exports two functions:
    
`specialize(t:Type,scopes:string[]):Type` - gives version of the type with respect to the given `scopes`

`toShape(obj:any,t:Type,scopes:string[]):any` - cleanups properties of the instance which are not visible
in the given scopes

#### Examples of usage:

Type specialization:

```typescript
import scopes=require('scopes')
let specializedType = scopes.specialize(type, ["read"]);
 ```

Instance specializaion: 

```typescript
import scopes=require('scopes')
let specializedInstance = scopes.specialize(person, PersonType, ["list"]);
```

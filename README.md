# Mapping Documents and Parser

> By Aria Bounds

The mapping document and it's parser are a system that I implemented
to provide a better system for mapping values from one set of data
to another.

The mapping document format in this folder are an attempt to provide a comprehensive
mapping system that is extendable, easy to parse, and customizable to every situation.
The document itself is human to readable with some basic JSON knowledge, although it
may become cumbersome with larger mapping documents. Introducing a UI that can read
and modify mapping documents may become necessary in the future.

This folder contains the following:

- [An example mapping document](./map-doc.json)
- [The JSON Schema for the mapping document](./map-doc-schema.json)
- [The JS Parser for mapping documents](./map-doc-parser.js)
- And some example data
  - [Input data](./pay-emp.json)
  - [Output data](./van-emp.json)

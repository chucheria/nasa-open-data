# DataGraph
NASA Open datasets graph


## To upload data to Neo4j

I tweaked a [David Meza query](https://github.com/davidmeza1/NASADatanauts/blob/fcd4aaf16425ea0f98ecd28ea45c986a712c1b7a/doc/Importcypher.cql) to get the info I needed. Thanks!

```
WITH "https://data.nasa.gov/data.json" AS url
CALL apoc.load.json(url) YIELD value
UNWIND value.dataset AS dbs
MERGE (dataset:Dataset {id:dbs.identifier}) ON
    CREATE SET dataset.bureauCode = dbs.bureauCode,
        dataset.POC = dbs.contactPoint.fn,
        dataset.email = dbs.contactPoint.hasEmail,
        dataset.description = dbs.description,
        dataset.landingPage = dbs.landingPage,
        dataset.title = dbs.title
    FOREACH (
        keyWord in dbs.keyword | MERGE (keyword:Keyword {name:keyWord})
        MERGE (keyword)-[:KEYWORD_IN]->(dataset)
        )
    FOREACH(
        t in dbs.theme | MERGE (theme:Theme {name:t}) MERGE (dataset)-[:IN_THEME]->(theme))
```

## Eliminate duplicates

Working with the dataset of datasets (the *meta-dataset*) I've found about 2/3 of titles are duplicates. That creates some questions:

- are all objects with same title the same dataset? Well, that's a pretty big assumption. Anyone would say *yes*, but I made the decision to considerate a duplicate the *node with same title and landingPage*, landingPage meaning the URL where you get the dataset.
- should I clean up the dataset before upload the data? I figured, since I've already have the method to upload directly from the online JSON, it would be a batch process that I don't need.
- should I query the nodes grouping by title and/or landingPage?

So, in the end, the sensible thing for me to do is... **eliminate duplicates from the database!** This is the process I followed:

1. Find nodes such as title is repeated in 2 or more nodes:

```cyper
MATCH (d:Dataset)
WITH d.title as title, d.landingPage as url, collect(d) AS nodes
WHERE size(nodes) > 1
RETURN nodes
```

2. We want to delete duplicate nodes keeping the first one removing relationships first, otherwise Neo4j will give us an error.

```cypher
MATCH (d:Dataset)
WITH d.title as title, d.landingPage as url, collect(d) AS nodes
WHERE size(nodes) > 1
UNWIND tail(nodes) as tails
MATCH (tails)-[r]-()
DELETE r
```

`Deleted 80294 relationships, completed after 916 ms.`

3. Delete the duplicated Datasets
```
MATCH (d:Dataset)
WITH d.title as title, d.landingPage as url, collect(d) AS nodes
WHERE size(nodes) >  1
FOREACH (d in tail(nodes) | DETACH DELETE d)
```

`Deleted 15051 nodes, completed after 369 ms.`

```cypher
MATCH (d:Dataset) RETURN count(*)
```

`42966`
`27915`

[Thanks jruts](https://gist.github.com/jruts/fe782ff2531d509784a24b655ad8ae76)

## Delete all nodes without landing page

```cypher
MATCH (d:Dataset)
WHERE NOT (EXISTS (d.landingPage))
WITH d
MATCH (d)-[r]-()
DELETE d,r
```

`Deleted 5826 nodes, deleted 53032 relationships, completed after 1546 ms.`

```cypher
MATCH (d:Dataset) RETURN count(*)
```

`22089`

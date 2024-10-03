import express from 'express';
import { Client } from '@elastic/elasticsearch';
import cors from 'cors'; // Import cors
import dotenv from 'dotenv';
const app = express();
const client = new Client({ node: 'http://localhost:9200' });


dotenv.config();

// Middleware to parse JSON
app.use(express.json());
app.use(cors());

async function createCollection(p_collection_name) {
    try {
        const collectionNameLower = p_collection_name.toLowerCase();

        const exists = await client.indices.exists({ index: collectionNameLower });
        if (exists.body) {
            console.log(`Collection '${collectionNameLower}' already exists.`);
            return;
        }

        await client.indices.create({
            index: collectionNameLower,
            body: {
                mappings: {
                    properties: {
                        name: { type: 'text' },
                        department: { type: 'keyword' }, 
                        gender: { type: 'text' },
                        
                    }
                }
            }
        });
        console.log(`Collection '${collectionNameLower}' created.`);
    } catch (error) {
        console.error('Error creating collection:', error);
    }
}



async function indexData(p_collection_name, dataType, data) {
    const collectionNameLower = p_collection_name.toLowerCase();
    try {
        for (const employee of data) {
            const { id, name, department, gender } = employee;
            await client.index({
                index: collectionNameLower,
                id: id, // use id as document ID
                body: {
                    name: name,
                    department: department,
                    gender: gender,
                }
            });
            console.log(`Indexed employee: ${JSON.stringify(employee)} with ID: ${id}`);
        }

       
        await client.indices.refresh({ index: collectionNameLower });
        console.log(`Data indexed into collection '${collectionNameLower}' successfully.`);
    } catch (error) {
        console.error('Error indexing data:', error);
    }
}




async function searchByColumn(p_collection_name, p_column_name, p_column_value) {
    const collectionNameLower = p_collection_name.toLowerCase();
    try {
        const result = await client.search({
            index: collectionNameLower,
            body: {
                query: {
                    match: {
                        [p_column_name]: p_column_value,
                    },
                },
            },
        });
        console.log(`Search results for '${p_column_name}':`, result.hits.hits);
        return result.hits.hits;
    } catch (error) {
        console.error('Error searching by column:', error);
    }
}


async function getEmpCount(p_collection_name) {
    const collectionNameLower = p_collection_name.toLowerCase();
    try {
        const result = await client.count({ index: collectionNameLower });
        console.log(`Employee count in '${collectionNameLower}':`, result.count);
        return result.count;
    } catch (error) {
        console.error('Error getting employee count:', error);
    }
}


async function delEmpById(p_collection_name, p_employee_id) {
    const collectionNameLower = p_collection_name.toLowerCase();
    try {
       
        const exists = await client.exists({
            index: collectionNameLower,
            id: p_employee_id,
        });

        if (!exists.body) {
            console.log(`Employee with ID '${p_employee_id}' not found in '${collectionNameLower}'.`);
            return;  
        }

        const response = await client.delete({
            index: collectionNameLower,
            id: p_employee_id,
        });

       
        console.log(`Delete response for employee ID '${p_employee_id}':`, response);

       
        if (response.body && response.body.result) {
            if (response.body.result === 'deleted') {
                console.log(`Employee with ID '${p_employee_id}' deleted from '${collectionNameLower}'.`);
            } else {
                console.log(`Employee with ID '${p_employee_id}' could not be deleted.`);
            }
        } else {
            console.log(`Unexpected response when deleting employee with ID '${p_employee_id}':`, response.body);
        }
    } catch (error) {
        console.error('Error deleting employee by ID:', error);
    }
}


async function getDepFacet(p_collection_name) {
    const collectionNameLower = p_collection_name.toLowerCase();
    try {
        const result = await client.search({
            index: collectionNameLower,
            body: {
                aggs: {
                    departments: {
                        terms: {
                            field: 'department',
                        },
                    },
                },
            },
        });
        console.log(`Department facets for '${collectionNameLower}':`, result.aggregations.departments.buckets);
        return result.aggregations.departments.buckets;
    } catch (error) {
        console.error('Error getting department facets:', error);
    }
}


(async () => {
    const v_nameCollection = 'Hash_Sowandarya'; 
    const v_phoneCollection = 'Hash_8087';

    // Delete existing collections if necessary
    await client.indices.delete({ index: v_nameCollection.toLowerCase() }).catch(err => console.log("Index not found, skipping deletion."));
    await client.indices.delete({ index: v_phoneCollection.toLowerCase() }).catch(err => console.log("Index not found, skipping deletion."));

  
    await createCollection(v_nameCollection);
    await createCollection(v_phoneCollection);

    const employeeData = [
        { id: 'E02001', name: 'John Doe', department: 'IT', gender: 'Male' },
        { id: 'E02002', name: 'Jane Doe', department: 'HR', gender: 'Female' },
        { id: 'E02003', name: 'Sam Smith', department: 'IT', gender: 'Male' },
    ];

    await indexData(v_nameCollection, 'Department', employeeData);
    await indexData(v_phoneCollection, 'Gender', employeeData);

  
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

   
    const allDocs = await client.search({
        index: v_nameCollection.toLowerCase(),
        body: {
            query: { match_all: {} }
        }
    });
    console.log('Documents in the index (Hash_Sowandarya):', allDocs.hits.hits);

   
    await getEmpCount(v_nameCollection);
    await delEmpById(v_nameCollection, 'E02003'); 

    
    const docsAfterDeletion = await client.search({
        index: v_nameCollection.toLowerCase(),
        body: {
            query: { match_all: {} }
        }
    });
    console.log('Documents in the index after deletion (Hash_Sowandarya):', docsAfterDeletion.hits.hits);

    await searchByColumn(v_nameCollection, 'department', 'IT');  
await searchByColumn(v_nameCollection, 'gender', 'Male');  
 await searchByColumn(v_phoneCollection, 'department', 'IT');  

 await getDepFacet(v_nameCollection);
 await getDepFacet(v_phoneCollection);
})();


// New search endpoint
app.get('/search', async (req, res) => {
    const { name } = req.query;
    const collectionName = 'Hash_Sowandarya'; // Your collection name

    try {
        const result = await client.search({
            index: collectionName.toLowerCase(),
            body: {
                query: {
                    match: {
                        name: name,
                    },
                },
            },
        });
        res.json(result.hits.hits); // Return the search results
    } catch (error) {
        console.error('Error searching by name:', error);
        res.status(500).send('Error searching by name');
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

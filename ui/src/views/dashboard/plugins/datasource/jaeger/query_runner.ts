// 1. Run the query to get the data from datasource
// 2. Convert the data to the format which AiAPM expects

import { PanelQuery } from "types/dashboard"
import { DataFrame, FieldType } from "types/dataFrame"
import { concat } from "lodash"
import { TimeRange } from "types/time"

export const run_prometheus_query = async (q: PanelQuery,range: TimeRange) => {
    //@todo: 
    // 1. rather than query directyly to prometheus, we should query to our own backend servie
    // 2. using `axios` instead of `fetch`
    
    const res0 = await fetch(`http://localhost:9090/api/v1/query_range?query=${q.metrics}&start=${range.start.getTime() / 1000}&end=${range.end.getTime() / 1000}&step=15`)
     
    const res = await res0.json()
    
    if (res.status !== "success") {
        console.log("Failed to fetch data from prometheus", res)
        return {
            error: `${res.errorType}: ${res.error}`,
            data: []
        }
    }


    if (res.data.result.length ==0 || res.data.result[0].values.length == 0) {
        return {
            error: null,
            data:[]
        }
    }


    const data = toDataFrame(q, res.data)
    return {
        error: null,
        data: data
    }
}



// "data": {
//     "resultType": "matrix",
//     "result": [
//         {
//             "metric": {
//                 "cpu": "0",
//                 "instance": "localhost:9100",
//                 "job": "node",
//                 "mode": "idle"
//             },
//             "values": [
//                 [
//                     1678865295,
//                     "0.5592903959242473"
//                 ],
const toDataFrame = (query: PanelQuery, data: any): DataFrame[] => {
    let res: DataFrame[] = []
    if (data.resultType === "matrix") {
        for (const m of data.result) {
            const length = m.values.length
            const metric = JSON.stringify(m.metric).replace(/:/g, '=')
            const timeValues = []
            const valueValues = []

            for (const v of m.values) {
                timeValues.push(v[0])
                valueValues.push(parseFloat(v[1]))
            }
            
            res.push({
                id: query.id,
                name: metric,
                length: length,
                fields: [
                    {
                        name: "Time",
                        type: FieldType.Time,
                        values: timeValues,
                    },
                    {
                        name: "Value",
                        type: FieldType.Number,
                        values: valueValues,
                        labels: m.metric
                    }
                ],
            })
        }
        return res
    }
    return []
}
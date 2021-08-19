const moment = require('moment');
const { mysql, redis } = require('./../db');
const logger = require('./../logger');
const connection = mysql.connectionPromise;
const HASH = `JOB_LISTING_PREVIEW`;

const LiveJobsColumns = [
    'j.job_id',
    'job_title',
    'company_name',
    'job_description',
    'minSal',
    'maxSal',
    'minExp',
    'maxExp',
    'live_date',
    'job_type',
    'gender_req',
    'working_days',
    'minimum_qualification',
    'shift_type',
    'recruiter_id',
    'category_id',
    'job_city_id',
    'job_locality_id',
    'no_of_openings',
    'interview_type',
    'is_fresher_allowed',
    'calls',
    'views',
    'applies',
    'recommendations',
    'client_id',
    'is_wfh',
    'is_contract',
    'sub_category_id',
    'prior_experience',
    'regional_language',
    'english_fluency',
    'prior_experiences',
    'regional_languages',
];

const LiveJob_Description_Columns = [
    'j.job_id',
    'job_description',
];

const getDataFromMySQL = async function (job_ids) {
    const query = `SELECT 
                        job_id,
                        job_title,
                        job_description
                    FROM
                        AppJobs j
                    WHERE job_id IN (?)
                    `;

    return await connection.query(query, [job_ids]);
}

const setData = async function (job_ids) {
    let data = await getDataFromMySQL(job_ids);
    data = data[0];
    let cache = {}
    for (let key in data) {
        cache[data[key]['job_id']] = JSON.stringify(data[key]);
    }
    const redisClient = await redis.getIoRedisClient();
    await redisClient.hmset(HASH, cache);

    return data;
}

const deleteData = async function (job_ids) {
    const redisClient = await redis.getIoRedisClient();
    return Promise.all(job_ids.map(async id => await redisClient.hdel(HASH, id)))
}

const updateJob = async function (job_id) {
    try {
        const current_gmt_time = moment().add((new Date()).getTimezoneOffset(), 'm').format('YYYY-MM-DD HH:mm:ss');
        const query = `SELECT 
                        ${[...LiveJobsColumns, ...LiveJob_Description_Columns].join(" , ")}
                    FROM
                        AppJobs j
                        LEFT JOIN 
                        Job_Reaches jr on j.job_id = jr.job_id
                    WHERE
                        j.job_id IN (?) 
                        AND j.job_status = 'ENABLED'
                        AND j.crm_qa_status = 'GO_LIVE'
                        AND j.hiring_end_date > '${current_gmt_time}'`;

        let [job] = await connection.query(query, [job_id]);
        const values = [];
        job = job[0];

        if (job) {
            // Live job upsert query
            const liveJobUpsertQuery = `INSERT INTO LiveJobs (job_id, job_title, minSal, 
                maxSal,minExp,maxExp,live_date,job_type,gender_req,working_days,
                minimum_qualification,shift_type,createdAt,updatedAt,no_of_openings,
                job_locality_id,job_city_id,category_id,recruiter_id,interview_type,
                views,recommendations,calls,applies,is_fresher_allowed,client_id,
                company_name,is_contract,is_wfh,sub_category_id,regional_language,
                prior_experience,english_fluency,prior_experiences,regional_languages)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,current_timestamp,current_timestamp,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE job_title=?, minSal=?,
                maxSal=?,minExp=?,maxExp=?,live_date=?,job_type=?,gender_req=?,working_days=?,
                minimum_qualification=?,shift_type=?,updatedAt=current_timestamp,no_of_openings=?,
                job_locality_id=?,job_city_id=?,category_id=?,recruiter_id=?,interview_type=?,
                views=?,recommendations=?,calls=?,applies=?,is_fresher_allowed=?,client_id=?,
                company_name=?,is_contract=?,is_wfh=?,sub_category_id=?,regional_language=?,
                prior_experience=?,english_fluency=?,prior_experiences=?,regional_languages= ?`;

            values.push(job_id, job.job_title, job.minSal,
                job.maxSal, job.minExp, job.maxExp, job.live_date, job.job_type, job.gender_req, job.working_days,
                job.minimum_qualification, job.shift_type, job.no_of_openings,
                job.job_locality_id, job.job_city_id, job.category_id, job.recruiter_id, job.interview_type,
                job.views, job.recommendations, job.calls, job.applies, job.is_fresher_allowed, job.client_id,
                job.company_name, job.is_contract, job.is_wfh, job.sub_category_id, job.regional_language,
                job.prior_experience, job.english_fluency, job.prior_experiences, job.regional_languages,
                job.job_title, job.minSal,
                job.maxSal, job.minExp, job.maxExp, job.live_date, job.job_type, job.gender_req, job.working_days,
                job.minimum_qualification, job.shift_type, job.no_of_openings,
                job.job_locality_id, job.job_city_id, job.category_id, job.recruiter_id, job.interview_type,
                job.views, job.recommendations, job.calls, job.applies, job.is_fresher_allowed, job.client_id,
                job.company_name, job.is_contract, job.is_wfh, job.sub_category_id, job.regional_language,
                job.prior_experience, job.english_fluency, job.prior_experiences, job.regional_languages
            );

            await connection.query(liveJobUpsertQuery, values);

            // live job description upsert query
            const liveJobDescriptionUpsertQuery = `INSERT INTO LiveJob_Descriptions
            (job_id, job_description, createdAt, updatedAt)
            VALUES (?,?,current_timestamp,current_timestamp)
            ON DUPLICATE KEY UPDATE job_description = ?, updatedAt = current_timestamp;`
            await connection.query(liveJobDescriptionUpsertQuery,
                [job.job_id, job.job_description, job.job_description]);

            // set data to redis
            await setData([job_id]);
        } else {
            // live job deletion query
            const deleteLiveJobQuery = `DELETE FROM LiveJobs WHERE job_id = ?`
            await await connection.query(deleteLiveJobQuery,
                [job_id]);

            // live job description deletion query
            const deleteLiveJobDescQuery = `DELETE FROM LiveJob_Descriptions WHERE job_id = ?`
            await await connection.query(deleteLiveJobDescQuery,
                [job_id]);

            // delete data from redis
            await deleteData([job_id])
        }
    } catch (error) {
        // republish message to queue
        logger.error(`jobId - ${job_id}`, error);
        throw error;
    }
}

module.exports = {
    updateJob,
}
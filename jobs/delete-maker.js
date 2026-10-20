require('dotenv').config()

const {
    createSupabase,
    ARTISAN_MAKERS_TABLE,
    ARTISAN_SCULPTS_TABLE,
    ARTISAN_COLORWAYS_TABLE,
} = require('../utils')

const supabase = createSupabase('maintenance')

const [_node, _path, ...rest] = process.argv

async function deleteMakers() {
    await supabase
        .from(ARTISAN_COLORWAYS_TABLE)
        .delete()
        .in('maker_id', rest)
        .then(({ status, statusText }) => {
            console.log(status, statusText)
        })
        .catch((error) => {
            console.error(error)
        })

    await supabase
        .from(ARTISAN_SCULPTS_TABLE)
        .delete()
        .in('maker_id', rest)
        .then(({ status, statusText }) => {
            console.log(status, statusText)
        })
        .catch((error) => {
            console.error(error)
        })

    await supabase
        .from(ARTISAN_MAKERS_TABLE)
        .delete()
        .in('id', rest)
        .then(({ status, statusText }) => {
            console.log(status, statusText)
        })
        .catch((error) => {
            console.error(error)
        })
}

deleteMakers()

import { Switch } from "@headlessui/react"
import * as fcl from "@onflow/fcl"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import useSWR from "swr"
import Key from "../../../components/common/Key"
import KeyCreator from "../../../components/common/KeyCreator"
import Layout from "../../../components/common/Layout"
import Spinner from "../../../components/common/Spinner"
import { getKeys } from "../../../flow/scripts"
import { classNames, isValidFlowAddress } from "../../../lib/utils"

const keysFetcher = async (funcName, address) => {
  return await getKeys(address)
}

export default function Keys(props) {
  const router = useRouter()
  const { account } = router.query

  const [keys, setKeys] = useState(null)
  const [user, setUser] = useState({ loggedIn: null })
  const [filteredKeys, setFilteredKeys] = useState([])
  const [hideRevoked, setHideRevoked] = useState(false)

  useEffect(() => fcl.currentUser.subscribe(setUser), [])

  const { data: keysData, error: keysError } = useSWR(
    account && isValidFlowAddress(account) ? ["keysFetcher", account] : null, keysFetcher
  )

  useEffect(() => {
    if (keysData) {
      setKeys(keysData)
    }
  }, [keysData])

  useEffect(() => {
    if (keys) {
      if (hideRevoked) {
        setFilteredKeys(keys.filter((k) => !k.revoked))
      } else {
        setFilteredKeys(keys)
      }
    }
  }, [keys, hideRevoked])

  const showKeys = () => {
    if (!keys) {
      return (
        <div className="flex mt-10 h-[200px] justify-center">
          <Spinner />
        </div>
      )
    }
    
    return (
      <div className="flex flex-col gap-y-4">
        <h1 className="flex gap-x-2 text-2xl font-bold text-gray-900">
          {`Keys (${filteredKeys.length})`}
          <div className="px-3 flex gap-x-2 items-center">
            <label className="block text-gray-600 text-base font-normal font-flow">
              Hide revoked
            </label>
            <Switch
              checked={hideRevoked}
              onChange={async () => {
                setHideRevoked(!hideRevoked)
              }}
              className={classNames(
                hideRevoked ? 'bg-drizzle' : 'bg-gray-200',
                'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-drizzle'
              )}
            >
              <span
                aria-hidden="true"
                className={classNames(
                  hideRevoked ? 'translate-x-5' : 'translate-x-0',
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200'
                )}
              />
            </Switch>
          </div>
        </h1>
        <div className="flex flex-col gap-y-4">
          {filteredKeys.length > 0 ?
            filteredKeys.map((key, index) => {
              return (
                <Key key={`key_${key.keyIndex}_${index}`} keyItem={key} account={account} user={user} />
              )
            }) :
            <div className="flex mt-10 h-[70px] text-gray-400 text-base justify-center">
              Nothing found
            </div>
          }
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl min-w-[380px] px-2">
      <Layout>
        <div className="flex flex-col gap-y-4">
          {
            user && user.loggedIn && user.addr == account ?
              <KeyCreator account={account} user={user} />
              : null
          }
          {showKeys()}
        </div>
      </Layout>
    </div>
  )
}
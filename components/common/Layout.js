import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import * as fcl from "@onflow/fcl"
import { getDefaultDomainsOfAddress } from "../../flow/scripts";
import { isValidFlowAddress } from "../../lib/utils";
import useSWR, { useSWRConfig } from "swr"
import publicConfig from "../../publicConfig";
import AlertModal from "./AlertModal";
import SearchBar from "./SearchBar";
import Sidebar from "./Siderbar";
import { useRecoilState } from "recoil"
import {
  showBasicNotificationState,
  basicNotificationContentState,
  currentDefaultDomainsState,
  transactionStatusState,
  transactionInProgressState,
  showNoteEditorState,
  accountBookmarkState
} from "../../lib/atoms"
import { DocumentDuplicateIcon, StarIcon } from "@heroicons/react/outline"
import { StarIcon as SolidStar } from "@heroicons/react/solid"
import { getBookmark } from "../../flow/bookmark_scripts";
import { removeAccountBookmark } from "../../flow/bookmark_transactions";
import NoteEditorModal from "../bookmark/NoteEditorModal";

const accountBookmarkFetcher = async (funcName, owner, target) => {
  if (publicConfig.chainEnv == "emulator") {
    return null
  }

  const bookmark = await getBookmark(owner, target)
  return bookmark
}

export default function Layout({ children }) {
  const [, setShowBasicNotification] = useRecoilState(showBasicNotificationState)
  const [, setBasicNotificationContent] = useRecoilState(basicNotificationContentState)
  const [showNoteEditor, setShowNoteEditor] = useRecoilState(showNoteEditorState)
  const [accountBookmark, setAccountBookmark] = useRecoilState(accountBookmarkState)
  const [transactionInProgress, setTransactionInProgress] = useRecoilState(transactionInProgressState)
  const [, setTransactionStatus] = useRecoilState(transactionStatusState)

  const { mutate } = useSWRConfig()

  const router = useRouter()
  const { account } = router.query

  const [user, setUser] = useState({ loggedIn: null })
  const [currentDefaultDomains, setCurrentDefaultDomains] = useRecoilState(currentDefaultDomainsState)
  const [bookmark, setBookmark] = useState(null)

  useEffect(() => fcl.currentUser.subscribe(setUser), [])

  const { data: bookmarkData, error: bookmarkError } = useSWR(
    user && user.loggedIn && account && isValidFlowAddress(account) ? ["accountBookmarkFetcher", user.addr, account] : null, accountBookmarkFetcher
  )

  useEffect(() => {
    setBookmark(bookmarkData)
  }, [bookmarkData])

  useEffect(() => {
    if (!(account && isValidFlowAddress(account))) {
      return
    }

    if (publicConfig.chainEnv !== "mainnet") {
      setCurrentDefaultDomains(null)
      return
    }

    if (!currentDefaultDomains || (currentDefaultDomains.address != account)) {
      setCurrentDefaultDomains(null)

      getDefaultDomainsOfAddress(account).then((domainsMap) => {
        const domains = []
        for (const [service, domain] of Object.entries(domainsMap)) {
          const comps = domain.split(".")
          const name = comps[0]
          const url = service == "flowns" ?
            `${publicConfig.flownsURL}/${domain}` : `${publicConfig.findURL}/${name}`
          domains.push({
            service: service,
            domain: domain,
            url: url
          })
        }
        setCurrentDefaultDomains({
          address: account,
          domains: domains
        })
      }).catch((e) => console.error(e))
    }
  }, [currentDefaultDomains, account])

  const showStarIcon = (bookmark) => {
    if (publicConfig.chainEnv == "emulator") {
      return null
    }
    if (!bookmark) {
      return <StarIcon className="text-gray-700 hover:text-drizzle w-6 h-6"
        onClick={async () => {
          if (transactionInProgress) {
            return
          }

          if (!user || !user.loggedIn) {
            setShowBasicNotification(true)
            setBasicNotificationContent({ type: "information", title: "Please connect your wallet first", detail: null })
            return
          }

          setAccountBookmark({
            address: account,
            note: ""
          })
          setShowNoteEditor(true)
        }}
      />
    }

    return <SolidStar className="text-yellow-400 w-6 h-6"
      onClick={async () => {
        if (transactionInProgress) {
          return
        }
        await removeAccountBookmark(account, setTransactionInProgress, setTransactionStatus)
        if (user && user.loggedIn && account) {
          mutate(["accountBookmarkFetcher", user.addr, account])
        }
      }}
    />

  }

  return (
    <>
      <div className="flex flex-col gap-y-2">
        <div className="px-5 mb-10">
          <SearchBar />
        </div>

        <div className="px-5 flex flex-col gap-y-1">
          <label className="text-lg sm:text-xl text-gray-500">Account</label>
          <div className="flex gap-x-2 items-center">
            <label className="text-2xl sm:text-3xl font-bold">{`${account}`}</label>
            <DocumentDuplicateIcon className="text-gray-700 hover:text-drizzle w-6 h-6"
              onClick={async () => {
                await navigator.clipboard.writeText(account)
                setShowBasicNotification(true)
                setBasicNotificationContent({ type: "information", title: "Copied!", detail: null })
              }} />
            {showStarIcon(bookmark)}
          </div>
          {
            bookmark ?
              <div className="flex gap-x-2 items-center">
                <label className={`font-semibold text-xs px-2 py-1 leading-4 rounded-full text-black bg-drizzle`}>
                  Note
                </label>
                <div className="text-gray-600 text-sm">{bookmark.note}</div>
              </div>
              : null
          }
        </div>

        {currentDefaultDomains && currentDefaultDomains.domains.length > 0 ?
          <div className="mt-4 px-5 flex flex-col gap-y-1">
            <label className="text-base sm:text-lg text-gray-500">Default Domains</label>
            <div className="mt-1 flex gap-x-2">{
              currentDefaultDomains.domains.map((domain, index) => {
                return (
                  <label key={`${domain.domain}_${index}`} className={`cursor-pointer font-bold text-sm px-3 py-2 leading-5 rounded-full text-emerald-800 bg-emerald-100`}>
                    <a href={domain.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {domain.domain}
                    </a>
                  </label>
                )
              })}
            </div>
          </div>
          : null
        }
        <div className="mt-10 flex flex-row gap-x-2 sm:gap-x-4 items-start justify-start">
          <Sidebar />
          {children}
        </div>
      </div>
      <AlertModal />
      <NoteEditorModal />
    </>
  )
}
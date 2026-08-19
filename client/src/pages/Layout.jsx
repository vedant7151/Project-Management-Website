/* eslint-disable react-hooks/exhaustive-deps */
 
import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { Loader2Icon, AlertCircle } from 'lucide-react'
import { useUser, SignIn, useAuth, CreateOrganization, useOrganizationList } from '@clerk/clerk-react'
import { fetchWorkspaces } from '../features/workspaceSlice'

const MAX_WORKSPACE_SYNC_ATTEMPTS = 15

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [syncAttempts, setSyncAttempts] = useState(0)
    
    const { loading, workspaces, error } = useSelector((state) => state.workspace)
    
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()

    const { userMemberships, isLoaded: isOrgLoaded } = useOrganizationList({
        userMemberships: { infinite: true },
    });

    const orgCount = userMemberships?.count ?? 0

    useEffect(() => {
        dispatch(loadTheme())
    }, [dispatch])

    // Clerk may have the new org before Inngest writes it to Postgres.
    // Poll a few times instead of spinning forever.
    useEffect(() => {
        if (!isLoaded || !isOrgLoaded || !user || error) return
        if (orgCount === 0) return
        if (workspaces.length > 0) return
        if (loading) return
        if (syncAttempts >= MAX_WORKSPACE_SYNC_ATTEMPTS) return

        const delay = syncAttempts === 0 ? 0 : 2000
        const timer = setTimeout(() => {
            dispatch(fetchWorkspaces({ getToken }))
                .finally(() => setSyncAttempts((n) => n + 1))
        }, delay)

        return () => clearTimeout(timer)
    }, [
        user?.id,
        isLoaded,
        isOrgLoaded,
        orgCount,
        workspaces.length,
        loading,
        error,
        syncAttempts,
        dispatch,
        getToken,
    ])

    if (!isLoaded) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950'>
                <SignIn />
            </div>
        )
    }

    if (error || (orgCount > 0 && workspaces.length === 0 && syncAttempts >= MAX_WORKSPACE_SYNC_ATTEMPTS)) {
        return (
            <div className='flex flex-col items-center justify-center h-screen bg-white dark:bg-zinc-950 text-red-500'>
                <AlertCircle className="size-12 mb-4" />
                <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-center max-w-md">
                    {error || 'Workspace was created in Clerk but is not in the database yet. Check Inngest/Clerk webhooks, then retry.'}
                </p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                    Retry Connection
                </button>
            </div>
        )
    }

    const waitingForWorkspace = orgCount > 0 && workspaces.length === 0
    if (loading || !isOrgLoaded || waitingForWorkspace) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (isOrgLoaded && orgCount === 0 && workspaces.length === 0) {
        return (
            <div className='min-h-screen flex flex-col gap-6 justify-center items-center bg-white dark:bg-zinc-950 px-4'>
                <div className='text-center space-y-2'>
                    <h1 className='text-2xl font-bold text-zinc-900 dark:text-zinc-100'>Welcome! Let's get started</h1>
                    <p className='text-sm text-zinc-500 dark:text-zinc-400'>You're not part of any workspace yet. Create one to begin.</p>
                </div>
                <CreateOrganization afterCreateOrganizationUrl="/" />
            </div>
        )
    }

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout

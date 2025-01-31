// modules
import process from 'process';

// types
type FriendRequest = {
    friendRequest: {
        sentAt: string;
        senderId: number;
        sourceUniverseId: number | 0;
        originSourceType: 'PlayerSearch' | 'UserProfile' | 'InGame';
        contactName: string | null;
        senderNickname: string;
    };
    mutualFriendsList: string[];
    id: number;
    name: string;
    displayName: string;
};

type FriendRequestsResponse = {
    previousPageCursor: string | null;
    nextPageCursor: string | null;
    data: FriendRequest[];
};

type UserDetails = {
    description: string;
    created: string;
    isBanned: boolean;
    externalAppDisplayName: null;
    hasVerifiedBadge: boolean;
    id: number;
    name: string;
    displayName: string;
};

// constants
const cookie = process.env.COOKIE;

if (!cookie) {
    console.error('Cookie not found in environment');
    process.exit();
}

// functions
function makeCookieHeader() {
    return `.ROBLOSECURITY=${cookie};`;
}

async function getXCSRFToken(): Promise<string | null> {
    const response = await fetch('https://auth.roblox.com/v2/logout', {
        method: 'POST',
        headers: {
            cookie: makeCookieHeader(),
            'Content-Type': 'application/json'
        }
    });

    const xcsrfToken = response.headers.get('x-csrf-token');
    return xcsrfToken;
}

async function getFriendRequestsPage(
    xcsrfToken: string,
    cursor: string | undefined
): Promise<FriendRequestsResponse> {
    const response = await fetch(
        `https://friends.roblox.com/v1/my/friends/requests?limit=100&cursor=${cursor ? cursor : ''}`,
        {
            headers: {
                'x-csrf-token': xcsrfToken,
                cookie: makeCookieHeader()
            }
        }
    );

    const data = (await response.json()) as FriendRequestsResponse;
    return data;
}

async function getUserDetails(userId: number): Promise<UserDetails> {
    const response = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
        headers: {
            cookie: makeCookieHeader()
        }
    });

    const data = (await response.json()) as UserDetails;
    return data;
}

// main function
async function main() {
    // get xcsrf token
    const xcsrfToken = await getXCSRFToken();

    if (!xcsrfToken) {
        console.error('Failed to get xcsrf token');
        process.exit();
    }

    // get friend requests
    const friendRequests: FriendRequest[] = [];
    let cursor: string | undefined = undefined;
    let pageNumber = 0;

    while (true) {
        pageNumber++;
        console.log(`Getting page ${pageNumber}`);
        const data = await getFriendRequestsPage(xcsrfToken, cursor);
        friendRequests.push(...data.data);

        if (!data.nextPageCursor) {
            break;
        }

        for (const friendRequest of data.data) {
            // mutuals
            if (friendRequest.mutualFriendsList.length > 0) {
                console.log(
                    `Friend request from ${friendRequest.name} has mutuals: ${friendRequest.mutualFriendsList.join(', ')}`
                );
            }

            // verified
            await getUserDetails(friendRequest.friendRequest.senderId)
                .then((userDetails) => {
                    if (userDetails.hasVerifiedBadge) {
                        console.log(
                            `Friend request from ${friendRequest.name} is verified`
                        );
                    }
                })
                .catch((error) => {
                    console.error(
                        `Failed to get user details for ${friendRequest.name}:`,
                        error
                    );
                });
        }

        cursor = data.nextPageCursor;
    }

    console.log(`Got ${friendRequests.length} friend requests`);
}

// run main function
main();

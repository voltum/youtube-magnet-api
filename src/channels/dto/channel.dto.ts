export class ChannelDto{
    folders: string[]
    readonly title: string
    readonly url: string
    readonly description: string
    readonly email: string
    readonly emailExists: boolean
    readonly country: string
    readonly language: string 
    readonly socialLinks: string
    readonly viewCount: number
    readonly videoCount: number
    readonly subscriberCount: number
    readonly note: string
    readonly lastVideoPublishedAt: Date
    readonly publishedAt: Date
}

export class UpdateOptions {
    arrayFilters: Array<object>
}

export class ChannelUpdateQuery{
    update: ChannelDto
    options: UpdateOptions
}
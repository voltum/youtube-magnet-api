export class ChannelDto{
    readonly id: string
    folder: string
    readonly title: string
    readonly url: string
    readonly description: string
    readonly email: string
    readonly country: string
    readonly language: string 
    readonly socialLinks: string
    readonly viewCount: number
    readonly videoCount: number
    readonly subscriberCount: number
    readonly lastVideoPublishedAt: Date
    readonly publishedAt: Date
}